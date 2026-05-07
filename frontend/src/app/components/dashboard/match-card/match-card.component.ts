import { Component, Input } from '@angular/core';

export type MatchResult = 'V' | 'E' | 'D';

export interface MatchCardData {
  opponent: string;
  date: string;
  venue: string;
  score: string;
  result: MatchResult;
}

@Component({
  selector: 'app-match-card',
  standalone: true,
  templateUrl: './match-card.component.html',
  styleUrl: './match-card.component.scss',
})
export class MatchCardComponent {
  resultClass = 'draw';
  resultLabel = 'Empate';

  private _match: MatchCardData = {
    opponent: '',
    date: '',
    venue: '',
    score: '',
    result: 'E',
  };

  @Input({ required: true })
  set match(value: MatchCardData) {
    this._match = value;
    this.resultClass = value.result === 'V' ? 'win' : value.result === 'D' ? 'loss' : 'draw';
    this.resultLabel = value.result === 'V' ? 'Victoria' : value.result === 'D' ? 'Derrota' : 'Empate';
  }

  get match() {
    return this._match;
  }
}

