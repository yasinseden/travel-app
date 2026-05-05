import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CanvasElement } from '../models/canvas-element.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl || 'https://placeholder-url.supabase.co',
      environment.supabaseKey || 'placeholder-key'
    );
  }

  async getCanvasElements() {
    const { data, error } = await this.supabase
      .from('canvas_elements')
      .select('*');
    if (error) throw error;
    return data as CanvasElement[];
  }

  async addCanvasElement(element: CanvasElement) {
    const { data, error } = await this.supabase
      .from('canvas_elements')
      .insert([element])
      .select();
    if (error) throw error;
    return data;
  }

  async updateCanvasElement(element: CanvasElement) {
    const { data, error } = await this.supabase
      .from('canvas_elements')
      .update(element)
      .eq('id', element.id)
      .select();
    if (error) throw error;
    return data;
  }

  async deleteCanvasElement(id: string) {
    const { data, error } = await this.supabase
      .from('canvas_elements')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return data;
  }
}
