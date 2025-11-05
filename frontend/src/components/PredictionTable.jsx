import { useState, useMemo } from 'react';

const PredictionTable = ({ predictions, problemType }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedConfidenceFilter, setSelectedConfidenceFilter] = useState('all');

  // Filter predictions based on search and confidence
  const filteredPredictions = useMemo(() => {
    let filtered = [...predictions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((pred, idx) => 
        String(pred.prediction).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(idx + 1).includes(searchTerm)
      );
    }

    // Confidence filter (for classification only)
    if (problemType === 'classification' && selectedConfidenceFilter !== 'all') {
      filtered = filtered.filter(pred => {
        const confidence = pred.confidence * 100;
        switch (selectedConfidenceFilter) {
          case 'high': return confidence >= 80;
          case 'medium': return confidence >= 60 && confidence < 80;
          case 'low': return confidence < 60;
          default: return true;
        }
      });
    }

    return filtered;
  }, [predictions, searchTerm, selectedConfidenceFilter, problemType]);

  // Sort predictions
  const sortedPredictions = useMemo(() => {
    let sorted = [...filteredPredictions];

    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case 'index':
            aValue = predictions.indexOf(a);
            bValue = predictions.indexOf(b);
            break;
          case 'prediction':
            aValue = a.prediction;
            bValue = b.prediction;
            break;
          case 'confidence':
            aValue = a.confidence || 0;
            bValue = b.confidence || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return sorted;
  }, [filteredPredictions, sortConfig, predictions]);

  // Pagination
  const totalPages = Math.ceil(sortedPredictions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPredictions = sortedPredictions.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="text-gray-400 ml-1">⇅</span>;
    }
    return sortConfig.direction === 'asc' 
      ? <span className="text-indigo-600 ml-1">↑</span> 
      : <span className="text-indigo-600 ml-1">↓</span>;
  };

  // Handle page change
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Get original index
  const getOriginalIndex = (pred) => {
    return predictions.indexOf(pred) + 1;
  };

  // Get confidence badge color
  const getConfidenceBadge = (confidence) => {
    const percent = confidence * 100;
    if (percent >= 80) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (percent >= 60) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  // Get prediction badge color
  const getPredictionBadge = (prediction) => {
    if (problemType === 'classification') {
      return String(prediction).toLowerCase() === 'yes' || String(prediction) === '1'
        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
        : 'bg-gray-100 text-gray-800 border-gray-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="w-full">
      {/* Controls Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search */}
          <div className="flex-1 min-w-0 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search predictions..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            {problemType === 'classification' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Confidence:</label>
                <select
                  value={selectedConfidenceFilter}
                  onChange={(e) => {
                    setSelectedConfidenceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="block w-32 pl-3 pr-10 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg bg-white"
                >
                  <option value="all">All</option>
                  <option value="high">High (≥80%)</option>
                  <option value="medium">Medium (60-80%)</option>
                  <option value="low">Low (&lt;60%)</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="block w-20 pl-3 pr-8 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {currentPredictions.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, sortedPredictions.length)} of {sortedPredictions.length} predictions
          {searchTerm || selectedConfidenceFilter !== 'all' ? (
            <span className="ml-1 text-indigo-600 font-medium">
              (filtered from {predictions.length} total)
            </span>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('index')}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                >
                  <div className="flex items-center">
                    #
                    {getSortIcon('index')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('prediction')}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                >
                  <div className="flex items-center">
                    Prediction
                    {getSortIcon('prediction')}
                  </div>
                </th>
                {problemType === 'classification' && (
                  <th
                    onClick={() => handleSort('confidence')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  >
                    <div className="flex items-center">
                      Confidence
                      {getSortIcon('confidence')}
                    </div>
                  </th>
                )}
                {currentPredictions[0]?.probabilities && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Class Probabilities
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPredictions.length > 0 ? (
                currentPredictions.map((pred) => (
                  <tr 
                    key={getOriginalIndex(pred)} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getOriginalIndex(pred)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getPredictionBadge(pred.prediction)}`}>
                        {String(pred.prediction)}
                      </span>
                    </td>
                    {problemType === 'classification' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {pred.confidence !== null ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getConfidenceBadge(pred.confidence)}`}>
                            {(pred.confidence * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                    )}
                    {pred.probabilities && (
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(pred.probabilities).map(([cls, prob]) => (
                            <span 
                              key={cls} 
                              className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-xs font-medium"
                            >
                              <span className="font-semibold text-gray-900">{cls}:</span>
                              <span className="ml-1 text-gray-600">{(prob * 100).toFixed(1)}%</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td 
                    colSpan={problemType === 'classification' ? 4 : 2} 
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-2">🔍</span>
                      <p className="text-sm">No predictions found matching your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* First page */}
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ««
            </button>

            {/* Previous page */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ‹
            </button>

            {/* Page numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next page */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ›
            </button>

            {/* Last page */}
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              »»
            </button>
          </div>

          {/* Jump to page (mobile) */}
          <div className="flex sm:hidden items-center gap-2">
            <span className="text-sm text-gray-700">Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionTable;
