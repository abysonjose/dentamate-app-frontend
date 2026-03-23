import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GapCoords { x: number; y: number; width: number; height: number; }
export interface GapResponse { gap: GapCoords | null; }
export interface AnalysisResponse {
  missing_teeth: boolean;
  gap_coordinates: GapCoords | null;
  recommended_shape: 'oval' | 'square' | 'tapered';
  tooth_color: string;
  confidence_score: number;
}

@Injectable({ providedIn: 'root' })
export class ArSmileService {
  private readonly API = 'http://localhost:8001';

  constructor(private http: HttpClient) {}

  detectGap(file: File): Observable<GapResponse> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<GapResponse>(`${this.API}/ar/detect-gap`, fd);
  }

  analyzePhoto(file: File): Observable<AnalysisResponse> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<AnalysisResponse>(`${this.API}/ar/analyze`, fd);
  }
}
