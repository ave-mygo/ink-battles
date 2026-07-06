export interface PasswordTransportKey {
  keyId: string;
  algorithm: string;
  publicKey: string;
}

interface EncryptedPasswordPayload {
  encryptedPassword: string;
  keyId: string;
}

export const isPasswordTransportKey = (value: unknown): value is PasswordTransportKey =>
  typeof value === "object"
  && value !== null
  && "keyId" in value
  && "algorithm" in value
  && "publicKey" in value
  && typeof value.keyId === "string"
  && typeof value.algorithm === "string"
  && typeof value.publicKey === "string";

/**
 * 把 PEM 公钥转换成 Web Crypto 可导入的 SPKI 二进制。
 */
const decodePemPublicKey = (publicKey: string): ArrayBuffer => {
  const base64 = publicKey
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
};

/**
 * 把二进制密文编码为接口传输用的 base64 字符串。
 */
const encodeBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

/**
 * 使用后端发布的短期公钥加密登录密码，避免登录 RPC 请求体携带明文密码。
 */
export const encryptPasswordForTransport = async (
  password: string,
  transportKey: PasswordTransportKey,
): Promise<EncryptedPasswordPayload> => {
  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    decodePemPublicKey(transportKey.publicKey),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"],
  );
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    cryptoKey,
    new TextEncoder().encode(password),
  );

  return {
    encryptedPassword: encodeBase64(encryptedBuffer),
    keyId: transportKey.keyId,
  };
};
