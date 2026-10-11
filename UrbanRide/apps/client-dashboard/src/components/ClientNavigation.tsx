import { NavLink } from 'react-router-dom'
const links = [
 { to:'/', label:'Overview', icon:'⌂', end:true },
 { to:'/employees', label:'Employees', icon:'♙' },
 { to:'/employees?add=1', label:'Add Employee', icon:'＋', special:true },
 { to:'/rides', label:'Rides', icon:'▱' },
 { to:'/reports', label:'Reports', icon:'▥' },
 { to:'/settings', label:'Settings', icon:'⚙' },
]
export function ClientNavigation() { return <nav className="client-navigation" aria-label="Company navigation">{links.map(link => <NavLink key={link.label} to={link.to} end={link.end} className={({isActive}) => `${isActive ? 'active' : ''} ${link.special ? 'client-nav-add' : ''}`}><span className="client-nav-icon" aria-hidden="true">{link.icon}</span><span>{link.label}</span></NavLink>)}</nav> }
