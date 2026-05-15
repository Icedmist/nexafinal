export interface Branch {
  id: string;
  name: string;
  location: string;
  isMain: boolean;
}

export interface Store {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  branches: Branch[];
  unitPresets?: Array<{
    name: string;
    conversionFactor: number;
  }>;
  branding?: {
    logo?: string;
    primaryColor?: string;
  };
  createdAt: string;
}

export interface Staff {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "manager" | "staff" | "system_admin" | "owner";
  storeId: string;
  ownerId: string;
  branchId: string;
  photoURL?: string;
  isActive: boolean;
  createdAt: string;
}
