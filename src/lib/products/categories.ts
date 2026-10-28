import type { Category } from "./types";

// Initial categories taken from the project brief (focus areas of the store).
// They become a managed `categories` table once Supabase is connected.
export const initialCategories: Category[] = [
  { slug: "beleza", name: "Beleza" },
  { slug: "perfumaria", name: "Perfumaria" },
  { slug: "cuidados-pessoais", name: "Cuidados pessoais" },
  { slug: "variedades", name: "Variedades" },
];
