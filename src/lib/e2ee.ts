const E2EE_SALT = new TextEncoder().encode('shopbag-e2ee-v1');

interface ActiveChannel {
  channelId: string;
  aesKey: CryptoKey;
  expiresAt: number;
}

let activeChannel: ActiveChannel | null = null;
let handshakePromise: Promise<ActiveChannel> | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function establishChannel(): Promise<ActiveChannel> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const clientPubRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const clientPublicKey = bytesToBase64(new Uint8Array(clientPubRaw));

  const res = await fetch('/api/security/handshake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientPublicKey }),
  });

  if (!res.ok) {
    throw new Error('Gagal membangun saluran terenkripsi.');
  }

  const data = (await res.json()) as {
    channelId: string;
    serverPublicKey: string;
    expiresAt: number;
  };

  const serverPubBytes = base64ToBytes(data.serverPublicKey);
  const serverPublicKey = await crypto.subtle.importKey(
    'raw',
    serverPubBytes.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: serverPublicKey },
    keyPair.privateKey,
    256
  );

  const hkdfBase = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: E2EE_SALT,
      info: new TextEncoder().encode(data.channelId),
    },
    hkdfBase,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const channel: ActiveChannel = {
    channelId: data.channelId,
    aesKey,
    expiresAt: data.expiresAt - 60_000, // Refresh 1 minute before expiry
  };
  activeChannel = channel;
  return channel;
}

async function getOrCreateChannel(forceRefresh = false): Promise<ActiveChannel> {
  if (!forceRefresh && activeChannel && Date.now() < activeChannel.expiresAt) {
    return activeChannel;
  }
  if (forceRefresh) {
    activeChannel = null;
  }
  if (!handshakePromise || forceRefresh) {
    handshakePromise = establishChannel().finally(() => {
      handshakePromise = null;
    });
  }
  return handshakePromise;
}

async function encryptObject(channel: ActiveChannel, payload: unknown, aadContext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const aad = new TextEncoder().encode(`${channel.channelId}:${aadContext}`);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    channel.aesKey,
    encoded
  );

  return {
    e2ee: true as const,
    channelId: channel.channelId,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
  };
}

async function decryptObject<T>(channel: ActiveChannel, envelope: { iv: string; ciphertext: string }, aadContext: string): Promise<T> {
  const iv = base64ToBytes(envelope.iv);
  const cipherBytes = base64ToBytes(envelope.ciphertext);
  const aad = new TextEncoder().encode(`${channel.channelId}:${aadContext}`);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer, additionalData: aad },
    channel.aesKey,
    cipherBytes.buffer as ArrayBuffer
  );

  const text = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(text) as T;
}

export async function secureJsonRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    token?: string | null;
  } = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const method = options.method ?? 'GET';
  const aadContext = `${method}:${path}`;

  const attempt = async (forceRefresh: boolean) => {
    const channel = await getOrCreateChannel(forceRefresh);
    const headers: Record<string, string> = {
      'X-E2EE-Channel': channel.channelId,
    };
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    let requestBody: string | undefined;
    if (options.body !== undefined && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      const envelope = await encryptObject(channel, options.body, aadContext);
      requestBody = JSON.stringify(envelope);
    }

    const res = await fetch(path, {
      method,
      headers,
      body: requestBody,
    });

    const raw = (await res.json()) as Record<string, unknown>;
    if (res.status === 428 && raw.code === 'E2EE_CHANNEL_EXPIRED' && !forceRefresh) {
      return attempt(true);
    }

    if (raw && raw.e2ee === true && typeof raw.iv === 'string' && typeof raw.ciphertext === 'string') {
      const decrypted = await decryptObject<T>(
        channel,
        { iv: raw.iv, ciphertext: raw.ciphertext },
        aadContext
      );
      return { ok: res.ok, status: res.status, data: decrypted };
    }

    return { ok: res.ok, status: res.status, data: raw as T };
  };

  return attempt(false);
}

export async function secureMultipartRequest<T>(
  path: string,
  method: 'POST' | 'PUT',
  metadata: Record<string, unknown>,
  photoFile: File | null,
  token: string
): Promise<{ ok: boolean; status: number; data: T }> {
  const aadContext = `${method}:${path}`;

  const attempt = async (forceRefresh: boolean) => {
    const channel = await getOrCreateChannel(forceRefresh);
    const envelope = await encryptObject(channel, metadata, aadContext);

    const formData = new FormData();
    formData.append('e2eePayload', JSON.stringify(envelope));
    if (photoFile) {
      formData.append('photo', photoFile);
    }

    const res = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-E2EE-Channel': channel.channelId,
      },
      body: formData,
    });

    const raw = (await res.json()) as Record<string, unknown>;
    if (res.status === 428 && raw.code === 'E2EE_CHANNEL_EXPIRED' && !forceRefresh) {
      return attempt(true);
    }

    if (raw && raw.e2ee === true && typeof raw.iv === 'string' && typeof raw.ciphertext === 'string') {
      const decrypted = await decryptObject<T>(
        channel,
        { iv: raw.iv, ciphertext: raw.ciphertext },
        aadContext
      );
      return { ok: res.ok, status: res.status, data: decrypted };
    }

    return { ok: res.ok, status: res.status, data: raw as T };
  };

  return attempt(false);
}
