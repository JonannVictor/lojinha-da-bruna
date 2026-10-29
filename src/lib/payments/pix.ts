// Static Pix QR Code ("BR Code"), following the Banco Central do Brasil
// manual: EMV fields (id + 2-digit length + value) ending in a CRC16. The
// payload is the same text used by "Pix copia e cola". Nothing is sent to a
// payment provider: the customer's bank reads the key and amount from it.

export type PixReceiver = {
  /** Normalized key: CPF/CNPJ digits, e-mail, +55 phone or random key. */
  key: string;
  /** Account holder, without accents, up to 25 characters. */
  name: string;
  /** Holder's city, without accents, up to 15 characters. */
  city: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RANDOM_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Normalizes a Pix key or returns null when it is not valid. A phone key
 * must start with +55: eleven digits alone are read as a CPF.
 */
export function parsePixKey(raw: string): string | null {
  const value = raw.trim();
  if (EMAIL.test(value)) return value.toLowerCase();
  if (RANDOM_KEY.test(value.toLowerCase())) return value.toLowerCase();
  if (value.startsWith("+")) {
    const phone = `+${value.replace(/\D/g, "")}`;
    return /^\+55\d{10,11}$/.test(phone) ? phone : null;
  }
  const digits = value.replace(/[.\-/\s]/g, "");
  return /^(\d{11}|\d{14})$/.test(digits) ? digits : null;
}

/** BR Code text fields are plain ASCII. */
function ascii(text: string, maxLength: number): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

/**
 * Builds the receiver from the store configuration. All fields null means
 * Pix is not configured yet; a partial or invalid configuration throws, so a
 * typo fails the build instead of showing a QR Code that can't be paid.
 */
export function resolvePixReceiver(config: {
  key: string | null;
  receiverName: string | null;
  city: string | null;
}): PixReceiver | null {
  const { key, receiverName, city } = config;
  if (key === null && receiverName === null && city === null) return null;
  const parsed = key === null ? null : parsePixKey(key);
  const name = ascii(receiverName ?? "", 25);
  const cleanCity = ascii(city ?? "", 15);
  if (!parsed || !name || !cleanCity) {
    throw new Error(
      "Configuração do Pix incompleta ou inválida em src/config/store.ts: preencha chave, nome do titular e cidade (telefone com +55).",
    );
  }
  return { key: parsed, name, city: cleanCity };
}

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC16/CCITT-FALSE (polynomial 0x1021, initial value 0xFFFF). */
function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** "Pix copia e cola" text; the amount is omitted when null. */
export function buildPixPayload(receiver: PixReceiver, amountCents: number | null): string {
  const amount =
    amountCents === null
      ? ""
      : field("54", `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, "0")}`);
  const body = [
    field("00", "01"),
    field("26", field("00", "br.gov.bcb.pix") + field("01", receiver.key)),
    field("52", "0000"),
    field("53", "986"),
    amount,
    field("58", "BR"),
    field("59", receiver.name),
    field("60", receiver.city),
    field("62", field("05", "***")),
    "6304",
  ].join("");
  return body + crc16(body);
}
