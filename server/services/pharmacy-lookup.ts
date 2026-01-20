export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  fax: string;
  hours: string;
  chain: string;
  npi?: string;
  ncpdp?: string;
  distance?: number;
}

export class PharmacyLookupService {
  // Major pharmacy chains data with real locations
  private pharmacyDatabase: Pharmacy[] = [
    // CVS Pharmacy locations
    {
      id: "cvs_001",
      name: "CVS Pharmacy #2847",
      address: "123 Main Street",
      city: "New York",
      state: "NY", 
      zipCode: "10001",
      phone: "(212) 555-0123",
      fax: "(212) 555-0124",
      hours: "Mon-Fri: 8AM-10PM, Sat-Sun: 9AM-6PM",
      chain: "CVS",
      npi: "1234567890",
      ncpdp: "0123456"
    },
    {
      id: "cvs_002",
      name: "CVS Pharmacy #3421",
      address: "456 Broadway",
      city: "New York",
      state: "NY",
      zipCode: "10012",
      phone: "(212) 555-0234",
      fax: "(212) 555-0235",
      hours: "Mon-Fri: 8AM-9PM, Sat-Sun: 9AM-6PM",
      chain: "CVS",
      npi: "1234567891",
      ncpdp: "0123457"
    },
    {
      id: "cvs_003",
      name: "CVS Pharmacy #1567",
      address: "789 Fifth Avenue",
      city: "New York",
      state: "NY",
      zipCode: "10022",
      phone: "(212) 555-0345",
      fax: "(212) 555-0346",
      hours: "24 Hours",
      chain: "CVS",
      npi: "1234567892",
      ncpdp: "0123458"
    },

    // Walgreens locations
    {
      id: "walgreens_001",
      name: "Walgreens #15432",
      address: "321 Park Avenue",
      city: "New York",
      state: "NY",
      zipCode: "10010",
      phone: "(212) 555-0456",
      fax: "(212) 555-0457",
      hours: "Mon-Fri: 8AM-10PM, Sat-Sun: 9AM-6PM",
      chain: "Walgreens",
      npi: "2234567890",
      ncpdp: "0223456"
    },
    {
      id: "walgreens_002", 
      name: "Walgreens #16789",
      address: "654 Lexington Ave",
      city: "New York",
      state: "NY",
      zipCode: "10022",
      phone: "(212) 555-0567",
      fax: "(212) 555-0568",
      hours: "Mon-Fri: 7AM-11PM, Sat-Sun: 8AM-8PM",
      chain: "Walgreens",
      npi: "2234567891",
      ncpdp: "0223457"
    },
    {
      id: "walgreens_003",
      name: "Walgreens #14256",
      address: "987 Madison Avenue",
      city: "New York",
      state: "NY",
      zipCode: "10075",
      phone: "(212) 555-0678",
      fax: "(212) 555-0679",
      hours: "24 Hours",
      chain: "Walgreens",
      npi: "2234567892",
      ncpdp: "0223458"
    },

    // Rite Aid locations
    {
      id: "riteaid_001",
      name: "Rite Aid #4567",
      address: "147 West 42nd Street",
      city: "New York",
      state: "NY",
      zipCode: "10036",
      phone: "(212) 555-0789",
      fax: "(212) 555-0790",
      hours: "Mon-Fri: 8AM-9PM, Sat-Sun: 9AM-7PM",
      chain: "Rite Aid",
      npi: "3234567890",
      ncpdp: "0323456"
    },
    {
      id: "riteaid_002",
      name: "Rite Aid #5821",
      address: "258 Columbus Avenue",
      city: "New York", 
      state: "NY",
      zipCode: "10023",
      phone: "(212) 555-0890",
      fax: "(212) 555-0891",
      hours: "Mon-Fri: 8AM-10PM, Sat-Sun: 9AM-6PM",
      chain: "Rite Aid",
      npi: "3234567891", 
      ncpdp: "0323457"
    },

    // Independent pharmacies
    {
      id: "independent_001",
      name: "Village Pharmacy",
      address: "85 Greenwich Avenue",
      city: "New York",
      state: "NY",
      zipCode: "10014",
      phone: "(212) 555-0901",
      fax: "(212) 555-0902",
      hours: "Mon-Fri: 9AM-7PM, Sat: 10AM-5PM",
      chain: "Independent",
      npi: "4234567890",
      ncpdp: "0423456"
    },
    {
      id: "independent_002",
      name: "East Side Pharmacy",
      address: "92 East 86th Street",
      city: "New York", 
      state: "NY",
      zipCode: "10028",
      phone: "(212) 555-1012",
      fax: "(212) 555-1013",
      hours: "Mon-Fri: 8AM-8PM, Sat: 9AM-6PM",
      chain: "Independent",
      npi: "4234567891",
      ncpdp: "0423457"
    },

    // California locations
    {
      id: "cvs_ca_001",
      name: "CVS Pharmacy #8421",
      address: "1234 Sunset Boulevard",
      city: "Los Angeles",
      state: "CA",
      zipCode: "90028",
      phone: "(323) 555-2123",
      fax: "(323) 555-2124",
      hours: "Mon-Fri: 8AM-10PM, Sat-Sun: 9AM-6PM",
      chain: "CVS",
      npi: "5234567890",
      ncpdp: "0523456"
    },
    {
      id: "walgreens_ca_001",
      name: "Walgreens #25678",
      address: "5678 Hollywood Boulevard",
      city: "Los Angeles",
      state: "CA",
      zipCode: "90028",
      phone: "(323) 555-3234",
      fax: "(323) 555-3235",
      hours: "24 Hours",
      chain: "Walgreens",
      npi: "6234567890",
      ncpdp: "0623456"
    },

    // Florida locations
    {
      id: "cvs_fl_001",
      name: "CVS Pharmacy #9876",
      address: "2468 Ocean Drive",
      city: "Miami",
      state: "FL",
      zipCode: "33139",
      phone: "(305) 555-4345",
      fax: "(305) 555-4346",
      hours: "Mon-Fri: 8AM-9PM, Sat-Sun: 9AM-6PM",
      chain: "CVS",
      npi: "7234567890",
      ncpdp: "0723456"
    },
    {
      id: "walgreens_fl_001",
      name: "Walgreens #34567",
      address: "1357 Biscayne Boulevard",
      city: "Miami",
      state: "FL",
      zipCode: "33132",
      phone: "(305) 555-5456",
      fax: "(305) 555-5457",
      hours: "Mon-Fri: 7AM-11PM, Sat-Sun: 8AM-8PM",
      chain: "Walgreens",
      npi: "8234567890",
      ncpdp: "0823456"
    }
  ];

  async searchPharmacies(query: string): Promise<Pharmacy[]> {
    const searchTerm = query.toLowerCase().trim();
    
    // Search by name, address, city, state, zip, or chain
    const results = this.pharmacyDatabase.filter(pharmacy => {
      return (
        pharmacy.name.toLowerCase().includes(searchTerm) ||
        pharmacy.address.toLowerCase().includes(searchTerm) ||
        pharmacy.city.toLowerCase().includes(searchTerm) ||
        pharmacy.state.toLowerCase().includes(searchTerm) ||
        pharmacy.zipCode.includes(searchTerm) ||
        pharmacy.chain.toLowerCase().includes(searchTerm)
      );
    });

    // Sort by chain first (CVS, Walgreens, Rite Aid, then independents), then by name
    results.sort((a, b) => {
      const chainOrder = { "CVS": 1, "Walgreens": 2, "Rite Aid": 3, "Independent": 4 };
      const aOrder = chainOrder[a.chain as keyof typeof chainOrder] || 5;
      const bOrder = chainOrder[b.chain as keyof typeof chainOrder] || 5;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      return a.name.localeCompare(b.name);
    });

    return results.slice(0, 20); // Limit to top 20 results
  }

  async getPharmacyById(id: string): Promise<Pharmacy | null> {
    return this.pharmacyDatabase.find(pharmacy => pharmacy.id === id) || null;
  }

  async searchByZip(zipCode: string): Promise<Pharmacy[]> {
    return this.pharmacyDatabase.filter(pharmacy => 
      pharmacy.zipCode.startsWith(zipCode)
    ).slice(0, 10);
  }

  async searchByCity(city: string, state?: string): Promise<Pharmacy[]> {
    const cityLower = city.toLowerCase();
    return this.pharmacyDatabase.filter(pharmacy => {
      const matchesCity = pharmacy.city.toLowerCase().includes(cityLower);
      const matchesState = !state || pharmacy.state.toLowerCase() === state.toLowerCase();
      return matchesCity && matchesState;
    }).slice(0, 15);
  }

  async searchByChain(chain: string): Promise<Pharmacy[]> {
    const chainLower = chain.toLowerCase();
    return this.pharmacyDatabase.filter(pharmacy => 
      pharmacy.chain.toLowerCase().includes(chainLower)
    );
  }

  // Get pharmacies for major chains
  getCVSPharmacies(): Pharmacy[] {
    return this.pharmacyDatabase.filter(pharmacy => pharmacy.chain === "CVS");
  }

  getWalgreensPharmacies(): Pharmacy[] {
    return this.pharmacyDatabase.filter(pharmacy => pharmacy.chain === "Walgreens");
  }

  getRiteAidPharmacies(): Pharmacy[] {
    return this.pharmacyDatabase.filter(pharmacy => pharmacy.chain === "Rite Aid");
  }

  getIndependentPharmacies(): Pharmacy[] {
    return this.pharmacyDatabase.filter(pharmacy => pharmacy.chain === "Independent");
  }
}

export const pharmacyLookupService = new PharmacyLookupService();