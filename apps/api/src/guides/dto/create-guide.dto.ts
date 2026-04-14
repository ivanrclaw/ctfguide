export class CreateGuideDto {
  title: string;
  description: string;
  ctfName: string;
  category: string;
  difficulty?: string;
}

export class UpdateGuideDto {
  title?: string;
  description?: string;
  ctfName?: string;
  category?: string;
  difficulty?: string;
  published?: boolean;
}