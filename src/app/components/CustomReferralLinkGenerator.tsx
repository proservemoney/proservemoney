import { useState, useEffect } from 'react';
import { Check, Copy, Link } from 'lucide-react';

interface CustomReferralLinkGeneratorProps {
  darkMode: boolean;
}

const CustomReferralLinkGenerator = ({ darkMode }: CustomReferralLinkGeneratorProps) => {
  const [campaign, setCampaign] = useState('');
  const [medium, setMedium] = useState('');
  const [source, setSource] = useState('');
  const [generatedLinks, setGeneratedLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreateLink = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Creating new referral link...');
      const response = await fetch('/api/user/referral-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign: campaign || 'default',
          medium: medium || 'custom',
          source: source || 'direct',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create referral link:', response.status, errorData);
        throw new Error(`Failed to create referral link: ${response.status} ${errorData.message || ''}`);
      }
      
      const data = await response.json();
      console.log('Created referral link:', data);
      
      if (data.success && data.referralLink) {
        // Add the new link to the top of the list
        setGeneratedLinks([data.referralLink, ...generatedLinks]);
        // Clear the form
        setCampaign('');
        setMedium('');
        setSource('');
      } else {
        setError(data.message || 'Failed to create link');
      }
    } catch (error: any) {
      console.error('Error in handleCreateLink:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLinks = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching referral links...');
      const response = await fetch('/api/user/referral-links');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch referral links:', response.status, errorData);
        throw new Error(`Failed to fetch referral links: ${response.status} ${errorData.message || ''}`);
      }
      
      const data = await response.json();
      console.log('Fetched referral links:', data);
      
      if (data.success && data.referralLinks) {
        setGeneratedLinks(data.referralLinks);
      } else {
        setError(data.message || 'Failed to load links');
      }
    } catch (error: any) {
      console.error('Error in fetchLinks:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = (text: string, linkId: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setCopiedLinkId(linkId);
    setTimeout(() => {
      setCopied(false);
      setCopiedLinkId(null);
    }, 2000);
  };
  
  // Load links when component mounts
  useEffect(() => {
    fetchLinks();
  }, []);
  
  const getLinkUrl = (shortId: string) => {
    return `${window.location.origin}/r/${shortId}`;
  };

  return (
    <div className={`w-full ${darkMode ? 'text-white' : 'text-gray-800'}`}>
      <div className={`p-5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h3 className="text-lg font-semibold mb-4">Create Custom Tracking Link</h3>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Campaign Name
            </label>
            <input
              type="text"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="e.g. summer_promo"
              className={`w-full p-2.5 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            />
          </div>
          
          <div>
            <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Medium
            </label>
            <input
              type="text"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder="e.g. email, social"
              className={`w-full p-2.5 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            />
          </div>
          
          <div>
            <label className={`block mb-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Source
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. twitter, facebook"
              className={`w-full p-2.5 rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>
        
        <button
          onClick={handleCreateLink}
          disabled={loading}
          className={`inline-flex items-center px-5 py-2.5 rounded-lg font-medium text-white ${
            loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Creating...' : 'Create Tracking Link'}
        </button>
      </div>

      <div className={`mt-6 p-5 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h3 className="text-lg font-semibold mb-4">Your Custom Tracking Links</h3>
        
        {generatedLinks.length === 0 ? (
          <p className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {loading ? 'Loading links...' : 'No custom links created yet. Create your first tracking link above.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <thead className={`text-xs uppercase ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                <tr>
                  <th scope="col" className="px-4 py-3 rounded-tl-lg">Link</th>
                  <th scope="col" className="px-4 py-3">Campaign</th>
                  <th scope="col" className="px-4 py-3">Medium</th>
                  <th scope="col" className="px-4 py-3">Source</th>
                  <th scope="col" className="px-4 py-3">Clicks</th>
                  <th scope="col" className="px-4 py-3">Conversions</th>
                  <th scope="col" className="px-4 py-3 rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {generatedLinks.map((link, index) => (
                  <tr key={link._id || index} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center space-x-1">
                        <Link size={16} className="text-blue-500" />
                        <span className="text-xs truncate max-w-[150px]">{getLinkUrl(link.shortId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{link.campaign}</td>
                    <td className="px-4 py-3">{link.medium}</td>
                    <td className="px-4 py-3">{link.source}</td>
                    <td className="px-4 py-3">{link.clicks}</td>
                    <td className="px-4 py-3">{link.conversions}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => copyToClipboard(getLinkUrl(link.shortId), link._id)}
                        className={`p-1.5 rounded-md ${
                          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                        aria-label="Copy link"
                      >
                        {copied && copiedLinkId === link._id ? (
                          <Check size={16} className="text-green-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomReferralLinkGenerator; 