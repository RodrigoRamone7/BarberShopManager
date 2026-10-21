declare module "multicast-dns" {
  export interface MdnsQuestion {
    name: string;
    type: string;
  }

  export interface MdnsQueryPacket {
    questions: MdnsQuestion[];
  }

  export interface MdnsAnswerRecord {
    name: string;
    type: "A" | "AAAA" | "PTR" | "TXT" | "SRV" | "CNAME";
    ttl?: number;
    data: string;
  }

  export interface MdnsInstance {
    on(event: "query", listener: (query: MdnsQueryPacket) => void): this;
    respond(packet: { answers: MdnsAnswerRecord[] }): void;
    destroy(callback?: () => void): void;
  }

  export default function createMdns(options?: {
    reuseAddr?: boolean;
    multicast?: boolean;
    port?: number;
  }): MdnsInstance;
}
