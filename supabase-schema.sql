-- Run this script in the Supabase SQL Editor

CREATE TABLE public.canvas_elements (
    id text PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('image', 'video', 'text')),
    content text NOT NULL,
    width numeric NOT NULL,
    height numeric NOT NULL,
    x numeric NOT NULL,
    y numeric NOT NULL,
    "zIndex" integer NOT NULL DEFAULT 1,
    "maintainAspectRatio" boolean NOT NULL DEFAULT true,
    
    -- Text specific properties
    "fontFamily" text,
    "fontSize" numeric,
    "fontWeight" text,
    color text,
    
    -- Element Styling
    rotation numeric DEFAULT 0,
    frame text DEFAULT 'none',
    
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.canvas_elements ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for demonstration
CREATE POLICY "Allow all operations for anonymous users" 
ON public.canvas_elements
FOR ALL 
USING (true)
WITH CHECK (true);
