import { redirect } from 'next/navigation';

export default function Home() {
  // The middleware already handles redirects, but if someone lands here directly:
  redirect('/dashboard');
}
