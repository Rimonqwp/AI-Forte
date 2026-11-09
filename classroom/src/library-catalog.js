// Data-only live catalog, also usable by non-React library helpers.
export const songCatalog = [];
export const versions = [];
export function setCatalog(data) {
  songCatalog.splice(0, songCatalog.length, ...data.songs);
  versions.splice(0, versions.length, ...data.versions);
}
