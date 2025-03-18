import React from 'react';

interface MetadataOption {
  title: string;
  subtitle: string;
  keywords: string[];
}

interface InstallPredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOption: MetadataOption | null;
  currentInstalls: number;
}

const InstallPredictionModal: React.FC<InstallPredictionModalProps> = ({
  isOpen,
  onClose,
  selectedOption,
  currentInstalls,
}) => {
  if (!isOpen || !selectedOption) return null;

  const predictedIncrease = Math.floor(Math.random() * 50 + 20); // 20-70% increase
  const predictedInstalls = Math.floor(currentInstalls * (1 + predictedIncrease / 100));
  const monthlyIncrease = Math.floor((predictedInstalls - currentInstalls) / 3); // Over 3 months

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
          aria-hidden="true"
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block w-full max-w-lg p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl sm:align-middle">
          <div className="flex justify-between items-start">
            <h3 className="text-2xl font-bold text-gray-800">Install Prediction</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-6 space-y-6">
            <div className="bg-indigo-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-indigo-900 mb-4">Predicted Impact</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-indigo-600">Current Monthly Installs</p>
                  <p className="text-2xl font-bold text-indigo-900">{currentInstalls.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-indigo-600">Predicted Monthly Installs</p>
                  <p className="text-2xl font-bold text-indigo-900">{predictedInstalls.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-indigo-600 mb-1">
                  <span>Increase</span>
                  <span>+{predictedIncrease}%</span>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, predictedIncrease)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800">Monthly Growth Projection</h4>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Month 1</span>
                    <span className="font-medium text-gray-900">
                      {(currentInstalls + monthlyIncrease).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Month 2</span>
                    <span className="font-medium text-gray-900">
                      {(currentInstalls + monthlyIncrease * 2).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Month 3</span>
                    <span className="font-medium text-gray-900">
                      {predictedInstalls.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Selected Metadata</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Title</p>
                  <p className="mt-1 text-gray-900">{selectedOption.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Subtitle</p>
                  <p className="mt-1 text-gray-900">{selectedOption.subtitle}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Keywords</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedOption.keywords.map((keyword: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPredictionModal; 