import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export function ApiDocs() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Developer Portal</h2>
          <p className="text-sm text-[#7c8791] mt-1">OpenAPI 3.0 Specifications & SDKs</p>
        </div>
      </div>

      <div className="bg-[#e6e9ec] rounded-xl overflow-hidden shadow-xl p-4">
        {/* Swagger UI uses light theme by default, wrapping it in a light container for readability */}
        <SwaggerUI url="/api-docs/swagger.json" />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .swagger-ui .info .title { color: #12171c; }
        .swagger-ui .scheme-container { background: transparent; padding: 0; margin-bottom: 20px; box-shadow: none; }
      `}} />
    </div>
  );
}
