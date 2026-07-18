import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { TauriIpcService } from '../services/tau-ipc.service';

@Component({
  selector: 'app-overview-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatTabsModule],
  template: `
    <div style="padding: 24px; max-width: 1000px; margin: 0 auto;">
      <h2>Overview</h2>
      <mat-tab-group [(selectedIndex)]="activeTab" animationDuration="0ms">
        <!-- EXERCISES TAB -->
        <mat-tab label="Exercises"><div style="padding-top: 16px;">
          <mat-card style="border-top:4px solid #3f51b5;margin-bottom:16px;"><mat-card-content style="padding:16px;">
            <h3 style="margin:0 0 8px;display:flex;align-items:center;gap:8px;"><mat-icon style="color:#3f51b5;">whatshot</mat-icon>Today</h3>
            <div style="display:flex;justify-content:space-around;text-align:center;">
              <div><div style="font-size:28px;font-weight:700;">{{ ex.today.attempts }}</div><small style="color:#888;">Attempts</small></div>
              <div><div style="font-size:28px;font-weight:700;color:#4caf50;">{{ ex.today.correct }}</div><small style="color:#888;">Correct</small></div>
              <div><div style="font-size:28px;font-weight:700;">{{ ex.today.accuracy }}%</div><small style="color:#888;">Accuracy</small></div>
            </div>
          </mat-card-content></mat-card>

          <mat-card style="margin-bottom:16px;"><mat-card-content style="padding:16px;">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center;">
              <div><div style="font-size:24px;font-weight:700;">{{ ex.streak }}</div><small style="color:#888;">Day Streak</small></div>
              <div><div style="font-size:24px;font-weight:700;">{{ ex.activeDays }}</div><small style="color:#888;">Days Practiced</small></div>
              <div><div style="font-size:24px;font-weight:700;">{{ ex.totalAttempts }}</div><small style="color:#888;">Attempts</small></div>
              <div><div style="font-size:24px;font-weight:700;color:#4caf50;">{{ ex.overallAccuracy }}%</div><small style="color:#888;">Avg Accuracy</small></div>
            </div>
          </mat-card-content></mat-card>

          @if (showExerciseTypes) {
            <mat-card style="margin-bottom:16px;"><mat-card-content style="padding:16px;">
              <h4 style="margin:0 0 12px;">By Practice Type</h4>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">
                @for (t of exTypes; track t.key) {
                  <div>
                    <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;">{{ t.label }}</div>
                    @if (t.attempts>0) {
                      <div style="display:flex;align-items:baseline;gap:8px;"><span style="font-size:18px;font-weight:700;">{{ t.correct }}/{{ t.attempts }}</span><span [style.color]="t.accuracy>=80?'#4caf50':t.accuracy>=50?'#ff9800':'#f44336'" style="font-size:13px;font-weight:600;">{{ t.accuracy }}%</span></div>
                      <div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;"><div [style.width.%]="t.accuracy" [style.background]="t.accuracy>=80?'#4caf50':t.accuracy>=50?'#ff9800':'#f44336'" style="height:100%;border-radius:3px;"></div></div>
                      <div style="font-size:10px;color:#888;margin-top:2px;">{{ t.attempts }} attempts all time</div>
                    } @else { <div style="font-size:10px;color:#888;">No data yet</div> }
                  </div>
                }
              </div>
            </mat-card-content></mat-card>
          }

          <mat-card style="margin-bottom:16px;"><mat-card-content style="padding:16px;">
            <h4 style="margin:0 0 12px;">Last 14 Days</h4>
            @if (last14Ex.length>0) {
              <div style="display:flex;align-items:flex-end;justify-content:space-between;height:120px;gap:4px;">
                @for (d of last14Ex; track d.date) {
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;">
                    @if (d.has) { <div [style.height.%]="d.acc||4" [style.min-height.px]="6" [style.background]="d.acc>=80?'#4caf50':d.acc>=50?'#ff9800':'#f44336'" style="width:100%;border-radius:3px 3px 0 0;display:flex;align-items:flex-start;justify-content:center;"><span style="font-size:9px;font-weight:600;color:#fff;">{{ d.total }}</span></div> }
                    @else { <div style="width:100%;height:4px;background:#e0e0e0;border-radius:2px;"></div> }
                    <span style="font-size:9px;color:#888;margin-top:4px;">{{ d.label }}</span>
                  </div>
                }
              </div>
              <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:11px;color:#888;">
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#4caf50;margin-right:4px;"></span>&ge;80%</span>
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff9800;margin-right:4px;"></span>50-79%</span>
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f44336;margin-right:4px;"></span><50%</span>
              </div>
            } @else { <p style="text-align:center;color:#888;">No practice sessions yet.</p> }
          </mat-card-content></mat-card>

          @if (ex.recent.length>0) {
            <mat-card style="margin-bottom:16px;"><mat-card-content style="padding:0;">
              <h4 style="padding:12px 16px 0;margin:0;">Recent Sessions</h4>
              @for (s of ex.recent; track s.date) {
                <div style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid #eee;">
                  <span style="width:68px;font-size:12px;color:#888;">{{ s.date | slice:-5 }}</span>
                  <div style="flex:1;height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden;"><div [style.width.%]="s.bw" [style.background]="s.acc>=80?'#4caf50':s.acc>=50?'#ff9800':'#f44336'" style="height:100%;border-radius:4px;"></div></div>
                  <span style="font-size:12px;font-weight:600;">{{ s.correct }}/{{ s.total }}</span><span style="font-size:11px;color:#888;min-width:34px;text-align:right;">{{ s.acc }}%</span>
                </div>
              } @empty { <p style="text-align:center;color:#888;padding:16px;">No recent sessions.</p> }
            </mat-card-content></mat-card>
          }
        </div></mat-tab>

        <!-- VOCABULARY TAB -->
        <mat-tab label="Vocabulary"><div style="padding-top:16px;">
          <mat-card style="border-top:4px solid #3f51b5;margin-bottom:16px;"><mat-card-content style="padding:16px;">
            <h3 style="margin:0 0 8px;display:flex;align-items:center;gap:8px;"><mat-icon style="color:#3f51b5;">whatshot</mat-icon>Today (Vocabulary)</h3>
            <div style="display:flex;justify-content:space-around;text-align:center;">
              <div><div style="font-size:28px;font-weight:700;">{{ vc.today.attempts }}</div><small style="color:#888;">Attempts</small></div>
              <div><div style="font-size:28px;font-weight:700;color:#4caf50;">{{ vc.today.correct }}</div><small style="color:#888;">Correct</small></div>
              <div><div style="font-size:28px;font-weight:700;">{{ vc.today.accuracy }}%</div><small style="color:#888;">Accuracy</small></div>
            </div>
          </mat-card-content></mat-card>

          @if (showVocabTypes) {
            <mat-card style="margin-bottom:16px;"><mat-card-content style="padding:16px;">
              <h4 style="margin:0 0 12px;">By Exercise Type</h4>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">
                @for (t of vocabTypes; track t.key) {
                  <div>
                    <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;">{{ t.label }}</div>
                    @if (t.attempts>0) {
                      <div style="display:flex;align-items:baseline;gap:8px;"><span style="font-size:18px;font-weight:700;">{{ t.correct }}/{{ t.attempts }}</span><span [style.color]="t.accuracy>=80?'#4caf50':t.accuracy>=50?'#ff9800':'#f44336'" style="font-size:13px;font-weight:600;">{{ t.accuracy }}%</span></div>
                      <div style="height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;"><div [style.width.%]="t.accuracy" [style.background]="t.accuracy>=80?'#4caf50':t.accuracy>=50?'#ff9800':'#f44336'" style="height:100%;border-radius:3px;"></div></div>
                      <div style="font-size:10px;color:#888;margin-top:2px;">{{ t.attempts }} attempts all time</div>
                    } @else { <div style="font-size:10px;color:#888;">No data yet</div> }
                  </div>
                }
              </div>
            </mat-card-content></mat-card>
          }
        </div></mat-tab>
      </mat-tab-group>
    </div>
  `,
})
export class OverviewPageComponent implements OnInit {
  activeTab = 0;
  ex = { today: { attempts:0,correct:0,accuracy:0 }, totalAttempts:0, overallAccuracy:0, activeDays:0, streak:0, recent: [] as any[] };
  exTypes = [{ key:'arrange-words',label:'Arrange Words',attempts:0,correct:0,accuracy:0},{ key:'fill-in-missing',label:'Fill in Missing',attempts:0,correct:0,accuracy:0},{ key:'spell-the-blanks',label:'Spell Blanks',attempts:0,correct:0,accuracy:0},{ key:'conversation',label:'Dialogue',attempts:0,correct:0,accuracy:0 }];
  showExerciseTypes = false;
  vc = { today: { attempts:0,correct:0,accuracy:0 }, totalAttempts:0 };
  vocabTypes = [{ key:'multiple-choice',label:'Multiple Choice',attempts:0,correct:0,accuracy:0},{ key:'spell-word',label:'Spell the Word',attempts:0,correct:0,accuracy:0},{ key:'type-word',label:'Type the Word',attempts:0,correct:0,accuracy:0 }];
  showVocabTypes = false;
  last14Ex: any[] = [];

  constructor(private ipc: TauriIpcService) {}

  async ngOnInit() {
    try {
      const [vs, es] = await Promise.all([this.ipc.invoke<any[]>('get_vocabulary_session_logs'), this.ipc.invoke<any[]>('get_exercise_session_logs')]);
      console.log('[Overview] vocab session logs:', vs?.length ?? 0, 'entries');
      console.log('[Overview] exercise session logs:', es?.length ?? 0, 'entries');
      if (es && es.length > 0) console.log('[Overview] sample exercise log:', JSON.stringify(es[0]));
      if (vs && vs.length > 0) console.log('[Overview] sample vocab log:', JSON.stringify(vs[0]));
      this.buildExercise(es||[]);
      this.buildVocab(vs||[]);
    } catch (e) { console.error('[Overview] error:', e); }
  }

  buildExercise(logs: any[]) {
    const today = new Date().toISOString().slice(0,10);
    let ta=0, tc=0; const ds=new Set<string>();
    for (const l of logs) {
      const d=l.date||l['date']; if(!d)continue;
      const a=l.totalAttempts||l['total_attempts']||0,c=l.correctCount||l['correct_count']||0; ta+=a; tc+=c; ds.add(d);
      this.exTypes[0].attempts+=l.arrangeWordsAttempts||l['arrange_words_attempts']||0; this.exTypes[0].correct+=l.arrangeWordsCorrect||l['arrange_words_correct']||0;
      this.exTypes[1].attempts+=l.fillInMissingAttempts||l['fill_in_missing_attempts']||0; this.exTypes[1].correct+=l.fillInMissingCorrect||l['fill_in_missing_correct']||0;
      this.exTypes[2].attempts+=l.spellTheBlanksAttempts||l['spell_the_blanks_attempts']||0; this.exTypes[2].correct+=l.spellTheBlanksCorrect||l['spell_the_blanks_correct']||0;
      this.exTypes[3].attempts+=l.conversationAttempts||l['conversation_attempts']||0; this.exTypes[3].correct+=l.conversationCorrect||l['conversation_correct']||0;
      if(d===today){ this.ex.today.attempts+=a; this.ex.today.correct+=c; }
    }
    this.ex.totalAttempts=ta; this.ex.overallAccuracy=ta>0?Math.round(tc/ta*100):0; this.ex.activeDays=ds.size;
    this.ex.today.accuracy=this.ex.today.attempts>0?Math.round(this.ex.today.correct/this.ex.today.attempts*100):0;
    for(const t of this.exTypes){ t.accuracy=t.attempts>0?Math.round(t.correct/t.attempts*100):0; }
    this.showExerciseTypes=this.exTypes.some(t=>t.attempts>0);
    let s=0; const td=new Date();
    for(let i=0;i<100;i++){ const d=new Date(td);d.setDate(d.getDate()-i); if(ds.has(d.toISOString().slice(0,10)))s++; else break; }
    this.ex.streak=s;
    const dn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const days=[]; const sorted=[...logs].sort((a,b)=>(b.date||b['date']||'').localeCompare(a.date||a['date']||''));
    for(let i=13;i>=0;i--){ const d=new Date();d.setDate(d.getDate()-i); const k=d.toISOString().slice(0,10); const e=sorted.find(l=>(l.date||l['date'])===k); const at=e?(e.totalAttempts||e['total_attempts']||0):0,cc=e?(e.correctCount||e['correct_count']||0):0; days.push({label:i===0?'Today':dn[d.getDay()],date:k,total:at,acc:at>0?Math.round(cc/at*100):0,has:at>0}); }
    this.last14Ex=days;
    const rx=sorted.slice(0,10); const mx=Math.max(1,...rx.map(l=>l.totalAttempts||l['total_attempts']||0));
    this.ex.recent=rx.map(l=>{const a=l.totalAttempts||l['total_attempts']||0,c=l.correctCount||l['correct_count']||0,acc=a>0?Math.round(c/a*100):0; return{date:l.date||l['date'],total:a,correct:c,acc,bw:Math.round(a/mx*100)};});
  }

  buildVocab(logs: any[]) {
    const today = new Date().toISOString().slice(0,10);
    for(const l of logs) {
      const d=l.date||l['date']; if(!d)continue;
      const a=l.totalAttempts||l['total_attempts']||0,c=l.correctCount||l['correct_count']||0; this.vc.totalAttempts+=a;
      this.vocabTypes[0].attempts+=l.multipleChoiceAttempts||l['multiple_choice_attempts']||0; this.vocabTypes[0].correct+=l.multipleChoiceCorrect||l['multiple_choice_correct']||0;
      this.vocabTypes[1].attempts+=l.spellWordAttempts||l['spell_word_attempts']||0; this.vocabTypes[1].correct+=l.spellWordCorrect||l['spell_word_correct']||0;
      this.vocabTypes[2].attempts+=l.typeWordAttempts||l['type_word_attempts']||0; this.vocabTypes[2].correct+=l.typeWordCorrect||l['type_word_correct']||0;
      if(d===today){ this.vc.today.attempts+=a; this.vc.today.correct+=c; }
    }
    this.vc.today.accuracy=this.vc.today.attempts>0?Math.round(this.vc.today.correct/this.vc.today.attempts*100):0;
    for(const t of this.vocabTypes){ t.accuracy=t.attempts>0?Math.round(t.correct/t.attempts*100):0; }
    this.showVocabTypes=this.vocabTypes.some(t=>t.attempts>0);
  }
}