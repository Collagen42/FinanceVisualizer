import { create } from 'zustand';
import { CompanyFinancials, FinancialDataset } from '../types/financial';
import { ParsingProgress } from '../types/parsing';

interface FinancialStore {
  // Data
  dataset: FinancialDataset | null;
  companies: CompanyFinancials[];

  // UI State
  selectedCompanyIds: string[];
  parsingProgress: ParsingProgress;

  // Actions
  setDataset: (dataset: FinancialDataset) => void;
  setSelectedCompanyIds: (ids: string[]) => void;
  toggleCompany: (id: string) => void;
  setParsingProgress: (progress: Partial<ParsingProgress>) => void;
  reset: () => void;
}

const initialProgress: ParsingProgress = {
  stage: 'idle',
  currentPage: 0,
  totalPages: 0,
  companiesFound: 0,
  message: '',
};

export const useFinancialStore = create<FinancialStore>((set, get) => ({
  dataset: null,
  companies: [],
  selectedCompanyIds: [],
  parsingProgress: initialProgress,

  setDataset: (dataset) => {
    const referenceCompany = dataset.companies.find((c) => c.isReferenceCompany);
    set({
      dataset,
      companies: dataset.companies,
      selectedCompanyIds: referenceCompany ? [referenceCompany.id] : dataset.companies.length > 0 ? [dataset.companies[0].id] : [],
    });
  },

  setSelectedCompanyIds: (ids) => set({ selectedCompanyIds: ids }),

  toggleCompany: (id) => {
    const { selectedCompanyIds } = get();
    if (selectedCompanyIds.includes(id)) {
      if (selectedCompanyIds.length > 1) {
        set({ selectedCompanyIds: selectedCompanyIds.filter((cid) => cid !== id) });
      }
    } else {
      set({ selectedCompanyIds: [...selectedCompanyIds, id] });
    }
  },

  setParsingProgress: (progress) =>
    set((state) => ({
      parsingProgress: { ...state.parsingProgress, ...progress },
    })),

  reset: () =>
    set({
      dataset: null,
      companies: [],
      selectedCompanyIds: [],
      parsingProgress: initialProgress,
    }),
}));
