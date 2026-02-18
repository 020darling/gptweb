export type Provider = "openai" | "gemini";

export type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  previewUrl?: string;
};

export type MessageRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  attachments?: Attachment[];
  reasoningSummary?: string;
};

export type Conversation = {
  id: string;
  title: string;
  provider: Provider;
  model: string;
  createdAt: number;
  updatedAt: number;
};