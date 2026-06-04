export interface LigneImportValidee {
  ligne: number;
  name: string;
  price: number;
  stock: number;
  sku: string;
  categoryName: string;
  categoryId: string | null;
  description: string;
  images: string[];
  erreurs: string[];
}

export interface ResultatImport {
  totalLignes: number;
  succes: number;
  echecs: number;
  erreurs: { ligne: number; erreurs: string[] }[];
  produitsCreesIds: string[];
}
