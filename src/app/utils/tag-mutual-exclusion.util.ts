/**
 * Handles mutual exclusion of "unfamiliar" and "ignore" tags.
 * - Adding "unfamiliar" removes "ignore"
 * - Adding "ignore" removes "unfamiliar"
 * Returns the updated tag list.
 */
export function addTagWithMutualExclusion(currentTags: string[], newTag: string): string[] {
  if (currentTags.includes(newTag)) return currentTags;

  let updated = [...currentTags, newTag];

  if (newTag === 'unfamiliar') {
    updated = updated.filter((t) => t !== 'ignore');
  } else if (newTag === 'ignore') {
    updated = updated.filter((t) => t !== 'unfamiliar');
  }

  return updated;
}