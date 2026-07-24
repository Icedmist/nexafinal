export interface DrugLibraryItem {
  id?: string;
  name: string;
  genericName: string;
  strength?: string;
  dosageForm: string;
  category: string;
  description?: string;
  manufacturer?: string;
  isPrescriptionOnly?: boolean;
  requiresPrescription?: boolean;
  source?: "nafdac_seed_v2" | "merchant_submitted" | "who_essential";
  verificationStatus?: "verified" | "pending_review" | "rejected";
  createdAt?: string;
}

export const DRUG_LIBRARY: DrugLibraryItem[] = [
  { name: "Paracetamol", genericName: "Acetaminophen", strength: "500mg", dosageForm: "Tablet", category: "Analgesic", isPrescriptionOnly: false, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Ibuprofen", genericName: "Ibuprofen", strength: "400mg", dosageForm: "Tablet", category: "Analgesic", isPrescriptionOnly: false, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Amoxicillin", genericName: "Amoxicillin", strength: "500mg", dosageForm: "Capsule", category: "Antibiotic", isPrescriptionOnly: true, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Metronidazole", genericName: "Metronidazole", strength: "400mg", dosageForm: "Tablet", category: "Antibiotic", isPrescriptionOnly: true, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Artemether-Lumefantrine", genericName: "Artemether/Lumefantrine", strength: "20/120mg", dosageForm: "Tablet", category: "Antimalarial", isPrescriptionOnly: true, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Coartem", genericName: "Artemether/Lumefantrine", strength: "80/480mg", dosageForm: "Tablet", category: "Antimalarial", isPrescriptionOnly: true, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Loratadine", genericName: "Loratadine", strength: "10mg", dosageForm: "Tablet", category: "Antihistamine", isPrescriptionOnly: false, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Cetirizine", genericName: "Cetirizine", strength: "10mg", dosageForm: "Tablet", category: "Antihistamine", isPrescriptionOnly: false, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Omeprazole", genericName: "Omeprazole", strength: "20mg", dosageForm: "Capsule", category: "Antacid/Gastro", isPrescriptionOnly: false, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Ranitidine", genericName: "Ranitidine", strength: "150mg", dosageForm: "Tablet", category: "Antacid/Gastro", isPrescriptionOnly: false, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Vitamin C", genericName: "Ascorbic Acid", strength: "1000mg", dosageForm: "Tablet", category: "Vitamin/Supplement", isPrescriptionOnly: false, source: "who_essential", verificationStatus: "verified" },
  { name: "Multivitamin", genericName: "Multivitamin Complex", strength: "Standard", dosageForm: "Tablet", category: "Vitamin/Supplement", isPrescriptionOnly: false, source: "who_essential", verificationStatus: "verified" },
  { name: "ORS Sachet", genericName: "Oral Rehydration Salts", strength: "Standard", dosageForm: "Sachet", category: "General", isPrescriptionOnly: false, source: "who_essential", verificationStatus: "verified" },
  { name: "Glucose Powder", genericName: "Dextrose Monohydrate", strength: "50g", dosageForm: "Sachet", category: "General", isPrescriptionOnly: false, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Azithromycin", genericName: "Azithromycin", strength: "500mg", dosageForm: "Tablet", category: "Antibiotic", isPrescriptionOnly: true, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Ciprofloxacin", genericName: "Ciprofloxacin", strength: "500mg", dosageForm: "Tablet", category: "Antibiotic", isPrescriptionOnly: true, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Diazepam", genericName: "Diazepam", strength: "5mg", dosageForm: "Tablet", category: "Analgesic", isPrescriptionOnly: true, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Salbutamol Inhaler", genericName: "Salbutamol", strength: "100mcg", dosageForm: "Inhaler", category: "General", isPrescriptionOnly: true, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Betamethasone Cream", genericName: "Betamethasone", strength: "0.1%", dosageForm: "Ointment", category: "General", isPrescriptionOnly: false, source: "nafdac_seed_v2", verificationStatus: "verified" },
  { name: "Neomycin Eye Drops", genericName: "Neomycin", strength: "0.5%", dosageForm: "Liquid", category: "General", isPrescriptionOnly: true, source: "nafdac_seed_v2", verificationStatus: "verified" },
];
