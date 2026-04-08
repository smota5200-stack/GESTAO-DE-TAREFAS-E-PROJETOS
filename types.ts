import { createClient } from '@supabase/supabase-js';

export interface Project {
  id: string;
  title: string;
  client: string;
  clientId?: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Concluída';
  status: 'A Fazer' | 'Entregue';
  progress: number;
  dueDate: string;
  comments?: number;
  description?: string;
  driveLink?: string;
  externalSystemLink?: string;
  asanaProjectId?: string;
  figmaLink?: string;
  githubRepo?: string;
  notionLink?: string;
  zoomLink?: string;
  teamsLink?: string;
  dropboxLink?: string;
  meetLink?: string;
  adobeStudioLink?: string;
  gmailLink?: string;
  outlookLink?: string;
  category?: string;
}

export interface ProjectAttachment {
  id: string;
  projectId: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

export type PriceItemType = 'Avulso' | 'Pacote';

export interface PriceTableItem {
  id: string;
  title: string;
  type: PriceItemType;
  price: number;
  description: string;
  quantity?: number; // Quantidade padrão para pacotes
  status?: 'Criação' | 'Recriação'; // Novo campo de status
}

export interface SubDemand {
  id: string;
  title: string;
  workStatus: 'A Fazer' | 'Entregue';
  driveLink?: string;
  externalSystemLink?: string;
}

export interface ProjectDemand {
  id: string;
  projectId: string;
  priceItemId?: string;
  title: string;
  type: PriceItemType;
  amount: number;
  cost?: number; // Custo do freelancer ou ferramenta
  dueDate: string;
  workStatus: 'A Fazer' | 'Entregue';
  paymentStatus: 'Pendente' | 'A Pagar' | 'Pago';
  description?: string;
  driveLink?: string;
  externalSystemLink?: string;
  totalQuantity: number; // Ex: 1 para avulso, 10 para pacote
  completedQuantity: number; // Progresso atual (ex: 4/10)
  asanaTaskId?: string;
  assigneeName?: string;
  priority?: string;
  postingDate?: string;
  format?: string;
  deliveryDate?: string;
  subDemands?: SubDemand[]; // Itens dentro de um pacote
}

export interface Metric {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  cpfCnpj: string;
  status: 'Ativo' | 'Inativo';
  totalSpent: number;
  notes: string;
  contractUrl?: string;
}

export interface Demand {
  id: string;
  clientName: string;
  company: string;
  requestDate: string;
  urgency: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Approved' | 'Declined';
  title: string;
  description: string;
}

export type NoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';

export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Password {
  id: string;
  title: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  category: string;
  createdAt: string;
}

export interface ServiceInvoice {
  id: string;
  clientId: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  issueDate: string;
  fileUrl: string;
  createdAt: string;
}

export interface DemandComment {
  id: string;
  demandId: string;
  userName: string;
  content: string;
  createdAt: string;
  type?: 'comment' | 'system';
}
