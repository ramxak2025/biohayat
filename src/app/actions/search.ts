"use server";

import { searchSuggestions } from "@/lib/search";

/** Живые подсказки для поиска (используется мобильным оверлеем). */
export async function getSearchSuggestions(query: string) {
  return searchSuggestions(query, 7);
}
