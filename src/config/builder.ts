export interface BuilderConfig {
  builder: {
    name: string;
    portalUrl: string;
    portalName: string;
  };
  user: {
    name: string;
    email: string;
    role: string;
    community: string;
    communityId: string;
    region: string;
    market: string;
  };
  scarStages: string[];
  plans: string[];
  fieldContacts: string[];
  tradePartners: Record<string, string>;
}

export const config: BuilderConfig = {
  builder: {
    name: '',
    portalUrl: '',
    portalName: 'Builder Portal',
  },
  user: {
    name: '',
    email: '',
    role: 'Construction Manager',
    community: '',
    communityId: '',
    region: '',
    market: '',
  },
  scarStages: ['Start', 'Frame', 'Second', 'Final'],
  plans: [],
  fieldContacts: [],
  // Trade categories used by Field Language settings. Company values are
  // per-user data and start empty — users add their own trade partners.
  tradePartners: {
    'Roofing': '',
    'Gutters': '',
    'Framing / Siding': '',
    'Masonry / Stone': '',
    'Stucco / Plastering': '',
    'Fencing': '',
    'Concrete': '',
    'Landscaping / Irrigation': '',
    'Painting & Touch-Up': '',
    'Drywall': '',
    'Trim / Baseboard / Caulk': '',
    'Door Hardware': '',
    'Stairs / Flooring': '',
    'Cabinets / Countertops': '',
    'Mirrors / Shower Glass': '',
    'Electrical': '',
    'Plumbing': '',
    'HVAC': '',
    'Insulation': '',
    'Windows': '',
    'Garage Door': '',
    'Appliances': '',
    'General Cleaning': '',
    'Pest Control': '',
  },
};
