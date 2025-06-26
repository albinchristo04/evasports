
export const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars but keep hyphens
    .replace(/--+/g, '-'); // Replace multiple - with single -
};

export const generateMatchPath = (leagueName: string, team1Name: string, team2Name: string, matchId: string): string => {
  const leagueSlug = slugify(leagueName);
  const teamsSlug = `${slugify(team1Name)}-vs-${slugify(team2Name)}`;
  return `/match/${leagueSlug}/${teamsSlug}/${matchId}`;
};
