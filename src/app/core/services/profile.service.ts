import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private _name   = new BehaviorSubject<string>('Jordan Davis');
  private _avatar = new BehaviorSubject<string | null>(null);

  name$     = this._name.asObservable();
  avatar$   = this._avatar.asObservable();
  initials$ = this._name.pipe(
    map(n => n.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase())
  );

  get name():   string        { return this._name.value; }
  get avatar(): string | null { return this._avatar.value; }

  get initials(): string {
    return this._name.value
      .split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }

  setName(name: string):  void { this._name.next(name); }
  setAvatar(url: string): void { this._avatar.next(url); }
}
