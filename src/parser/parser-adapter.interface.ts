import { KnowledgeDocument } from '../common/types.js';

export interface ParserAdapter {
  parse(input: string | Buffer, sourceUrl: string): Promise<KnowledgeDocument>;
}
