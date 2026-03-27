import React from 'react';
import { CompanyFinancials } from '../../types/financial';

interface CompanySelectorProps {
  companies: CompanyFinancials[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({
  companies,
  selectedIds,
  onToggle,
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {companies.map((company) => {
        const isSelected = selectedIds.includes(company.id);
        return (
          <button
            key={company.id}
            onClick={() => onToggle(company.id)}
            className={`
              inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium
              transition-colors duration-150 border
              ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            {company.isReferenceCompany && (
              <span className="text-xs" title="Reference company">
                {isSelected ? '\u2605' : '\u2606'}
              </span>
            )}
            <span>{company.name}</span>
            {company.isReferenceCompany && (
              <span className="text-xs opacity-70">(ref)</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CompanySelector;
