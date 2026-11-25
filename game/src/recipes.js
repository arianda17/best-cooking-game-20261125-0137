// Recipes, ingredients and kitchen stations for Ember & Thyme: Bistro Rush.
// Everything is drawn in code; these are pure data + small helpers.

export const INGREDIENTS = [
  { key: 'bun', label: 'Bun', keyCode: 'Digit1', color: '#c9a962', icon: '🥖', emoji: '🍞', stack: false },
  { key: 'patty', label: 'Patty', keyCode: 'Digit2', color: '#5d4037', icon: '🍖', emoji: '🥩', stack: false },
  { key: 'cheese', label: 'Cheese', keyCode: 'Digit3', color: '#f59e0b', icon: '🧀', emoji: '🧀', stack: true },
  { key: 'lettuce', label: 'Lettuce', keyCode: 'Digit4', color: '#22c55e', icon: '🥬', emoji: '🥬', stack: true },
  { key: 'tomato', label: 'Tomato', keyCode: 'Digit5', color: '#ef4444', icon: '🍅', emoji: '🍅', stack: true },
  { key: 'onion', label: 'Onion', keyCode: 'Digit6', color: '#e5e7eb', icon: '🧅', emoji: '🧅', stack: true },
  { key: 'egg', label: 'Egg', keyCode: 'Digit7', color: '#fef3c7', icon: '🥚', emoji: '🥚', stack: false },
  { key: 'bread', label: 'Bread', keyCode: 'Digit8', color: '#d4a373', icon: '🍞', emoji: '🥪', stack: false },
  { key: 'pasta', label: 'Pasta', keyCode: 'Digit9', color: '#f1f5f9', icon: '🍝', emoji: '🍜', stack: false },
];

export function ingredientByKey(key) { return INGREDIENTS.find((i) => i.key === key); }

export const RECIPES = [
  {
    id: 'burger', label: 'Burger',
    needs: ['bun', 'patty-cooked', 'cheese', 'lettuce', 'tomato', 'bun'],
    baseScore: 120, unlock: 0, emoji: '🍔',
  },
  {
    id: 'salad', label: 'Salad',
    needs: ['lettuce', 'tomato', 'onion-chopped'],
    baseScore: 80, unlock: 250, emoji: '🥗',
  },
  {
    id: 'sandwich', label: 'Sandwich',
    needs: ['bread', 'cheese', 'tomato', 'bread'],
    baseScore: 90, unlock: 500, emoji: '🥪',
  },
  {
    id: 'pasta', label: 'Pasta',
    needs: ['pasta', 'tomato', 'cheese'],
    baseScore: 100, unlock: 750, emoji: '🍝',
  },
  {
    id: 'soup', label: 'Soup',
    needs: ['tomato', 'onion-chopped', 'cheese'],
    baseScore: 70, unlock: 1000, emoji: '🍲',
  },
];

export function recipeById(id) { return RECIPES.find((r) => r.id === id); }

// A normalized plate ingredient (what the player placed, with cook/chop state applied).
export function plateItem(key, cooked, chopped) { return { key, cooked, chopped }; }

// Normalize needs list into (key, state) pairs for comparison.
export function needStates(needs) {
  return needs.map((n) => {
    if (n.endsWith('-cooked')) return { key: n.slice(0, -7), cooked: true, chopped: false };
    if (n.endsWith('-chopped')) return { key: n.slice(0, -8), cooked: false, chopped: true };
    return { key: n, cooked: false, chopped: false };
  });
}

// Check whether an assembled plate satisfies a recipe's needs (order matters for stacked
// layers; cooked/chopped state must match).
export function plateMatchesRecipe(items, needs) {
  const want = needStates(needs);
  if (items.length !== want.length) return false;
  for (let i = 0; i < items.length; i++) {
    const a = items[i]; const b = want[i];
    if (a.key !== b.key || a.cooked !== b.cooked || a.chopped !== b.chopped) return false;
  }
  return true;
}

export const UNLOCK_ORDER = ['burger', 'salad', 'sandwich', 'pasta', 'soup'];
export function unlockedRecipes(score) {
  return RECIPES.filter((r) => score >= r.unlock);
}