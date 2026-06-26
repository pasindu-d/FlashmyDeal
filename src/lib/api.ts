/**
 * Safely parse a Response as JSON, checking the Content-Type header first
 * and handling any parsing errors gracefully with explicit logging of non-JSON responses.
 */
export async function safeParseJson(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  
  // Clone or read the body as text safely
  const rawText = await response.text();
  
  // Log details about incoming payloads for debugging
  console.log(`[API Response Handlers] Validating response. Status: ${response.status}, Content-Type: ${contentType}`);
  
  if (!contentType.includes('application/json')) {
    console.error(`[API ERROR] Expected JSON but received content-type: "${contentType}". Raw payload (first 1000 chars):`, rawText.substring(0, 1000));
    throw new Error(`The server returned a non-JSON response (Status: ${response.status}). The server might have crashed or returned an HTML error page.`);
  }

  try {
    const data = JSON.parse(rawText);
    return data;
  } catch (err: any) {
    console.error('[API ERROR] Failed to parse response text as JSON. Raw text (first 1000 chars):', rawText.substring(0, 1000), err);
    throw new Error(`Invalid JSON payload received from server: ${err.message || err}`);
  }
}

/**
 * Perform a fetch request and automatically parse the response safely
 */
export async function safeFetchJson(url: string, options?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      let errorMessage = `HTTP error ${res.status}!`;
      try {
        const errData = await safeParseJson(res);
        errorMessage = errData.error || errorMessage;
      } catch (parseErr: any) {
        errorMessage = `HTTP ${res.status}: ${parseErr.message || parseErr}`;
      }
      throw new Error(errorMessage);
    }
    return await safeParseJson(res);
  } catch (err: any) {
    console.error(`[Fetch Failure] Error during fetch to ${url}:`, err);
    throw err;
  }
}
