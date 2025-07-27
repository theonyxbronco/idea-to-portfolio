import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Server } from 'lucide-react';

const ConnectionTest = () => {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const testConnection = async () => {
    setStatus('testing');
    setResponse(null);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      console.log('Testing connection to:', apiUrl);

      const healthResponse = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }

      const healthData = await healthResponse.json();
      
      const infoResponse = await fetch(`${apiUrl}/api/info`);
      const infoData = await infoResponse.json();

      setResponse({
        health: healthData,
        info: infoData,
        apiUrl
      });
      setStatus('success');

    } catch (err) {
      console.error('Connection test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'testing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Testing...</Badge>;
      case 'success':
        return <Badge variant="secondary" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Not Tested</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Server className="h-5 w-5 mr-2" />
          Backend Connection Test
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">API URL:</p>
            <p className="text-sm text-muted-foreground">
              {import.meta.env.VITE_API_URL || 'http://localhost:3001'}
            </p>
          </div>
          <Button 
            onClick={testConnection} 
            disabled={status === 'testing'}
            variant="outline"
          >
            {status === 'testing' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              'Test Connection'
            )}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 font-medium">Connection Failed:</p>
            <p className="text-sm text-red-600">{error}</p>
            <div className="mt-2 text-xs text-red-500">
              <p>Common solutions:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Make sure backend is running (npm run dev in portfolio-backend)</li>
                <li>Check if port 3001 is available</li>
                <li>Verify CORS settings</li>
              </ul>
            </div>
          </div>
        )}

        {response && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium">✅ Connection Successful!</p>
            </div>
            
            <div className="p-3 bg-gray-50 border rounded-md">
              <p className="text-sm font-medium mb-2">Server Response:</p>
              <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionTest;