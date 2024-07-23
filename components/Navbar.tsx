"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';

const Navbar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'ข้อมูลสถานะ', path: '/power-outage-requests' },
    { label: 'Admin', path: '/admin/create-user' },
  ];

  return (
    <nav className="bg-gray-800 text-white p-4">
      <ul className="flex space-x-4">
        {navItems.map((item) => (
          <li key={item.path}>
            <Link 
              href={item.path}
              className={`hover:text-gray-300 ${
                pathname === item.path ? 'font-bold' : ''
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
        {session ? (
          <>
            <li>Welcome, {session.user?.name}!</li>
            <li>
              <button onClick={() => signOut()}>Sign out</button>
            </li>
          </>
        ) : (
          <li>
            <button onClick={() => signIn()}>Sign in</button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;