import { Droplets, Wind, Zap } from 'lucide-react'

export type WhatsAppScenario = {
  category: string
  description: string
  icon: typeof Wind
  id: string
  location: string
  message: string
  name: string
  phone: string
  serviceType: string
  title: string
}

export const WHATSAPP_SCENARIOS: WhatsAppScenario[] = [
  {
    id: 'hvac',
    icon: Wind,
    category: 'HVAC',
    title: 'AC Grinding Noise & Failure',
    serviceType: 'AC Repair & Diagnostics',
    name: 'Priya Sharma',
    phone: '+91 98765 43210',
    location: 'Kakkanad, Kochi',
    description: 'Compressor grinding noise, emergency cooling breakdown.',
    message:
      'Hi, my AC is not cooling properly and making a loud grinding noise since morning. We are at Kakkanad, near Infopark, Apt 302, Building C. Can someone please come tomorrow morning? - Priya',
  },
  {
    id: 'plumbing',
    icon: Droplets,
    category: 'Plumbing',
    title: 'Bathroom Pipe Burst & Flooding',
    serviceType: 'Emergency Plumbing',
    name: 'Rajesh Menon',
    phone: '+91 98450 12345',
    location: 'Edapally, Kochi',
    description: 'Water leaking heavily onto bathroom floor.',
    message:
      'Urgent! Water pipe under the bathroom washbasin has cracked and is flooding the floor at Edapally, Flat 4B, Galaxy Apts. Need a plumber right away! - Rajesh',
  },
  {
    id: 'electrical',
    icon: Zap,
    category: 'Electrical',
    title: 'Main MCB Tripping with Geyser',
    serviceType: 'Electrical Diagnostics',
    name: 'Sunita Nair',
    phone: '+91 97401 55678',
    location: 'Kaloor, Kochi',
    description: 'Circuit breaker trips when high-power appliance runs.',
    message:
      'Hello, our main power switch is tripping continuously whenever we turn on the geyser or AC. Smelling slight burning odor near the fuse box at Kaloor. - Sunita',
  },
]
