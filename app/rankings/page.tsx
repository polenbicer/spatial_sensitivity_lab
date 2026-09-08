import RankingExplorer from './ranking-explorer';

export const metadata = {
  title: 'Full Rankings | Spatial Sensitivity Lab',
  description: 'Explore and export full within-city urban cooling priority rankings for Amsterdam and Brussels.',
};

export default function RankingsPage() {
  return <RankingExplorer />;
}
