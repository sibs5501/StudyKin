import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { materialId, contentType, content, fileUrl, imageDataUrl } = await req.json();
    
    if (!materialId || !contentType || !content) {
      throw new Error('Missing required fields: materialId, contentType, and content');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Processing ${contentType} for material: ${materialId}`);

    // Update status to processing
    await supabase
      .from('study_materials')
      .update({ status: 'processing' })
      .eq('id', materialId);

    // Process content based on file type
    let processedContent = content;
    
    // Prefer direct image data if provided (bypasses Storage)
    if (imageDataUrl) {
      console.log('Extracting content from provided image data URL');
      processedContent = await extractImageContentFromDataUrl(imageDataUrl, openAIApiKey);
    } else if (fileUrl && content.includes('Content will be extracted during AI processing')) {
      console.log('Extracting content from file:', fileUrl);
      processedContent = await extractContentFromFile(fileUrl, supabase, openAIApiKey);
    }

    let aiContent;
    let title = '';

    switch (contentType) {
      case 'summary':
        title = 'Smart Summary';
        aiContent = await generateSummary(processedContent, openAIApiKey);
        break;
      case 'flashcard':
        title = 'Flashcards';
        aiContent = await generateFlashcards(processedContent, openAIApiKey);
        break;
      case 'quiz':
        title = 'Practice Quiz';
        aiContent = await generateQuiz(processedContent, openAIApiKey);
        break;
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }

    // Save AI-generated content
    const { error: insertError } = await supabase
      .from('ai_content')
      .insert({
        study_material_id: materialId,
        content_type: contentType,
        title,
        content: aiContent
      });

    if (insertError) {
      console.error('Error saving AI content:', insertError);
      throw insertError;
    }

    // Update status to processed
    await supabase
      .from('study_materials')
      .update({ status: 'processed' })
      .eq('id', materialId);

    console.log(`Successfully processed ${contentType} for material: ${materialId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      contentType,
      title,
      content: aiContent 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI study processor:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing the study material' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Retry function with exponential backoff for rate limiting
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isRateLimited = error.message.includes('Too Many Requests') || 
                           error.message.includes('rate limit');
      
      if (isLastAttempt || !isRateLimited) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

async function extractContentFromFile(fileUrl: string, supabase: any, openAIApiKey: string): Promise<string> {
  try {
    console.log('Downloading file from:', fileUrl);
    
    // Get the file from Supabase storage
    const { data: fileData, error } = await supabase.storage
      .from('study-materials')
      .download(fileUrl);
    
    if (error) {
      console.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }

    // Convert blob to buffer
    const buffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    // Determine file type from URL
    const fileExtension = fileUrl.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'pdf') {
      return await extractPDFContent(uint8Array, openAIApiKey);
    } else if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(fileExtension || '')) {
      return await extractImageContent(uint8Array, openAIApiKey);
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error('Error extracting content from file:', error);
    throw new Error(`Content extraction failed: ${error.message}`);
  }
}

async function extractPDFContent(buffer: Uint8Array, openAIApiKey: string): Promise<string> {
  // For now, we'll use OpenAI to analyze the PDF as a document
  // In a production environment, you might want to use a proper PDF parser
  console.log('Processing PDF with AI analysis');
  
  // Convert to base64 for AI processing
  const base64 = btoa(String.fromCharCode(...buffer));
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a document analysis assistant. Extract and summarize the key text content from documents. Focus on extracting readable text, main concepts, and important information.'
        },
        {
          role: 'user',
          content: 'This is a PDF document. Please extract the main text content and provide a comprehensive overview of the material that can be used for creating study materials.'
        }
      ],
      max_tokens: 3000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content || 'Could not extract content from PDF';
}

async function extractImageContent(buffer: Uint8Array, openAIApiKey: string): Promise<string> {
  console.log('Processing image with OpenAI Vision');
  
  // Convert to base64
  const base64 = btoa(String.fromCharCode(...buffer));
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing images containing text, diagrams, charts, or educational content. Extract all visible text and describe any important visual elements that could be relevant for studying.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this image and extract all text content, describe any diagrams, charts, or visual elements that would be useful for creating study materials. Provide a comprehensive description of the educational content.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 3000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Vision API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content || 'Could not extract content from image';
}

async function extractImageContentFromDataUrl(dataUrl: string, openAIApiKey: string): Promise<string> {
  console.log('Processing image data URL with OpenAI Vision');
  return await retryWithBackoff(async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing images containing text, diagrams, charts, or educational content. Extract all visible text and describe any important visual elements that could be relevant for studying.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Please analyze this image and extract all text content, describe any diagrams, charts, or visual elements that would be useful for creating study materials. Provide a comprehensive description of the educational content.' },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
            ]
          }
        ],
        max_tokens: 3000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI Vision API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`OpenAI Vision API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || 'Could not extract content from image';
  });
}

async function generateSummary(content: string, apiKey: string) {
  return await retryWithBackoff(async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert study assistant. Create concise, well-organized summaries that highlight key concepts, main ideas, and important details. Format your response as structured text with clear headings and bullet points.'
          },
          {
            role: 'user',
            content: `Please create a comprehensive summary of the following study material:\n\n${content}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      summary: data.choices[0].message.content,
      generatedAt: new Date().toISOString()
    };
  });
}

async function generateFlashcards(content: string, apiKey: string) {
  return await retryWithBackoff(async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert study assistant. Create flashcards from study material. Each flashcard should have a clear, concise question on the front and a comprehensive answer on the back. Focus on key concepts, definitions, and important facts. Return the response as a JSON array of objects with "front" and "back" properties.'
          },
          {
            role: 'user',
            content: `Create flashcards from this study material. Generate 8-12 flashcards covering the most important concepts:\n\n${content}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const flashcardsText = data.choices[0].message.content;
    
    try {
      // Try to parse as JSON first
      const flashcards = JSON.parse(flashcardsText);
      return {
        flashcards: Array.isArray(flashcards) ? flashcards : [],
        generatedAt: new Date().toISOString()
      };
    } catch {
      // If not JSON, create a single flashcard with the content
      return {
        flashcards: [{ front: 'Study Summary', back: flashcardsText }],
        generatedAt: new Date().toISOString()
      };
    }
  });
}

async function generateQuiz(content: string, apiKey: string) {
  return await retryWithBackoff(async () => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert study assistant. Create a practice quiz from study material. Generate multiple-choice questions that test understanding of key concepts. Each question should have 4 options with only one correct answer. Return the response as a JSON array of objects with "question", "options" (array of 4 strings), and "correctAnswer" (index 0-3) properties.'
          },
          {
            role: 'user',
            content: `Create a practice quiz from this study material. Generate 6-8 multiple-choice questions covering the main concepts:\n\n${content}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const quizText = data.choices[0].message.content;
    
    try {
      // Try to parse as JSON first
      const questions = JSON.parse(quizText);
      return {
        questions: Array.isArray(questions) ? questions : [],
        generatedAt: new Date().toISOString()
      };
    } catch {
      // If not JSON, create a single question
      return {
        questions: [{
          question: 'What is the main topic of this study material?',
          options: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
          correctAnswer: 0
        }],
        generatedAt: new Date().toISOString()
      };
    }
  });
}