/**
 * '모두의 꿀조합 레시피' 데이터 모델과 순수 함수.
 * 레시피는 서버(community_recipes)에 저장되고, 좋아요 +1/-1은 서버 함수가 처리합니다.
 */
export type CommunityRecipe = {
  id: string;
  author: string;
  avatar: string;
  emoji: string;
  name: string;
  ingredients: string[];
  steps: string[];
  tip: string;
  likes: number;
  views: number;
  createdAt: string; // ISO
};

export type SortMode = "popular" | "latest" | "likes";

export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "popular", label: "🔥 인기순" },
  { value: "latest", label: "🆕 최신순" },
  { value: "likes", label: "👍 추천 많은 순" },
];

export const AVATARS = ["👤", "🧑‍🍳", "👩‍🍳", "🐻", "🐰", "🐱", "🦊", "🐧"];

/** 인기순 = 조회수, 최신순 = 올린 시각, 추천 많은 순 = 좋아요 수 */
export function sortCommunity(list: CommunityRecipe[], mode: SortMode): CommunityRecipe[] {
  const copy = [...list];
  if (mode === "popular") return copy.sort((a, b) => b.views - a.views);
  if (mode === "likes") return copy.sort((a, b) => b.likes - a.likes);
  return copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
