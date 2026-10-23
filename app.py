"""Small bilingual desktop launcher. No gameplay keyboard polling or remote handshake."""
from pathlib import Path
import queue,sys,threading,tkinter as tk
from tkinter import ttk,messagebox
import dual_boss as engine

TEXT={
 'en':dict(title='TFH Boss Sync',subtitle='Oleander + Velvet · experimental v0.5.0',
  warning='BOTH players must run the SAME release and keep it connected. Without matching mods, matches can desync ("parallel worlds"). There is NO remote mod check or automatic refusal.',
  consent='I have agreed with my opponent to use this same release.',refresh='Refresh games',start='Connect selected',stop='Stop',
  status='Not connected',scanning='Looking for games…',connecting='Checking build and connecting…',ready='Connected — start a NEW match. Remote peer status: unknown.',
  stopping='Stopping…',stopped='Stopped — restart affected games before reconnecting or playing unmodded.',failed='Connection failed — see details below.',
  pid='PID',store='Build',path='Game location',guide='Quick start',rules='Move rules',details='Status / errors',
  select='Select one game on your PC (or two for local dual-client tests). Both characters are handled automatically.',
  needconsent='Please agree on this release with your opponent first.',needgame='Select one or two games.',
  restart='Restart the previously connected game before reconnecting. Never continue unmodded in the same process.',
  close='Stop the MOD and close? Restart affected games afterwards. Do not stop during a match.',
  stopconfirm='Stop now? Both players should first return to the main menu. Restart affected games before continuing.',error='TFH Boss Sync',
  quick='README.md',moves='MOVES.en.md'),
 'zh':dict(title='TFH Boss Sync',subtitle='奥莉 + VV · 实验版 v0.5.0',
  warning='双方必须运行相同版本，并保持工具连接。不匹配会导致不同步（“平行时空”）。本工具没有远端 MOD 检测，也不会自动拒绝对战。',
  consent='我已与对手约定使用相同版本。',refresh='刷新游戏',start='连接所选游戏',stop='停止',
  status='未连接',scanning='正在查找游戏…',connecting='正在校验版本并连接…',ready='已连接：请开始新对局。远端是否开启：未知。',
  stopping='正在停止…',stopped='已停止：重新连接或玩原版前，请重启已连接的游戏。',failed='连接失败：请查看下方详情。',
  pid='进程',store='构建',path='游戏位置',guide='使用说明',rules='招式规则',details='状态 / 错误',
  select='选择本机一个游戏（本机双端测试可选两个）。自动处理双方角色。',
  needconsent='请先与对手约定使用相同版本。',needgame='请选择一个或两个游戏。',
  restart='请先重启之前连接的游戏；不要在同一游戏进程里继续玩原版。',
  close='停止 MOD 并关闭？之后请重启已连接的游戏。不要在对局中停止。',
  stopconfirm='现在停止？双方应先回主菜单；继续游玩前需要重启已连接的游戏。',error='TFH Boss Sync',
  quick='README.zh-CN.md',moves='MOVES.zh-CN.md')
}
ASSETS=Path(getattr(sys,'_MEIPASS',Path(__file__).resolve().parent))

class App:
 def __init__(self,root):
  self.root=root;self.lang='en';self.events=queue.Queue();self.running=False;self.scanning=False
  self.stop_event=None;self.state='status';self.rows={};self.tainted=set();self.closing=False;self.last_error=False
  root.title('TFH Boss Sync 0.5.0');root.geometry('860x730');root.minsize(720,600)
  root.protocol('WM_DELETE_WINDOW',self.close)
  self.frame=ttk.Frame(root,padding=18);self.frame.pack(fill='both',expand=True)
  top=ttk.Frame(self.frame);top.pack(fill='x')
  self.heading=ttk.Label(top,font=('Segoe UI',18,'bold'));self.heading.pack(side='left')
  self.language=ttk.Button(top,text='中文',command=self.switch_language);self.language.pack(side='right')
  self.subtitle=ttk.Label(self.frame);self.subtitle.pack(anchor='w',pady=(3,12))
  self.warning=tk.Label(self.frame,bg='#fff0cc',fg='#5c3b00',justify='left',anchor='w',padx=12,pady=10,wraplength=760)
  self.warning.pack(fill='x');root.bind('<Configure>',lambda e:self.warning.configure(wraplength=max(500,self.frame.winfo_width()-44)))
  self.consent=tk.BooleanVar(value=False);self.agreement=ttk.Checkbutton(self.frame,variable=self.consent);self.agreement.pack(anchor='w',pady=10)
  self.selection=ttk.Label(self.frame,wraplength=780);self.selection.pack(anchor='w',pady=(0,7))
  self.table=ttk.Treeview(self.frame,columns=('pid','store','path'),show='headings',height=3,selectmode='extended')
  for key,width in [('pid',70),('store',120),('path',550)]:self.table.column(key,width=width,minwidth=60,stretch=key=='path')
  self.table.pack(fill='x')
  buttons=ttk.Frame(self.frame);buttons.pack(fill='x',pady=10)
  self.refresh_button=ttk.Button(buttons,command=self.refresh);self.refresh_button.pack(side='left')
  self.start_button=ttk.Button(buttons,command=self.connect);self.start_button.pack(side='left',padx=8)
  self.stop_button=ttk.Button(buttons,command=self.stop,state='disabled');self.stop_button.pack(side='left')
  self.status=ttk.Label(self.frame,wraplength=780);self.status.pack(anchor='w',pady=(0,12))
  self.tabs=ttk.Notebook(self.frame);self.tabs.pack(fill='both',expand=True)
  self.pages=[];self.texts=[]
  for i in range(3):
   page=ttk.Frame(self.tabs);text=tk.Text(page,wrap='word',font=('Segoe UI',10),padx=12,pady=10,state='disabled')
   bar=ttk.Scrollbar(page,command=text.yview);text.configure(yscrollcommand=bar.set)
   bar.pack(side='right',fill='y');text.pack(fill='both',expand=True)
   self.tabs.add(page,text='');self.pages.append(page);self.texts.append(text)
  self.translate();root.after(80,self.drain);self.refresh()
 def tr(self,key):return TEXT[self.lang][key]
 def set_status(self,key):self.state=key;self.status.configure(text=self.tr(key))
 def put_text(self,i,value):
  text=self.texts[i];text.configure(state='normal');text.delete('1.0','end');text.insert('end',value);text.configure(state='disabled')
 def translate(self):
  for widget,key in [(self.heading,'title'),(self.subtitle,'subtitle'),(self.warning,'warning'),(self.agreement,'consent'),(self.selection,'select'),(self.refresh_button,'refresh'),(self.start_button,'start'),(self.stop_button,'stop')]:widget.configure(text=self.tr(key))
  self.language.configure(text='中文' if self.lang=='en' else 'English')
  for key in ['pid','store','path']:self.table.heading(key,text=self.tr(key))
  for i,key in enumerate(['guide','rules','details']):self.tabs.tab(i,text=self.tr(key))
  for i,key in enumerate(['quick','moves']):self.put_text(i,(ASSETS/self.tr(key)).read_text(encoding='utf-8'))
  self.set_status(self.state)
 def switch_language(self):self.lang='zh' if self.lang=='en' else 'en';self.translate()
 def refresh(self):
  if self.running or self.scanning:return
  self.scanning=True;self.refresh_button.configure(state='disabled');self.start_button.configure(state='disabled');self.set_status('scanning')
  def work():
   try:self.events.put(('games',engine.discover()))
   except Exception as e:self.events.put(('scan_error',str(e)))
  threading.Thread(target=work,daemon=True).start()
 def connect(self):
  if self.running or self.scanning:return
  if not self.consent.get():messagebox.showwarning(self.tr('error'),self.tr('needconsent'));return
  pids=[int(i) for i in self.table.selection()]
  if not 1<=len(pids)<=2:messagebox.showwarning(self.tr('error'),self.tr('needgame'));return
  if self.tainted.intersection(pids):messagebox.showwarning(self.tr('error'),self.tr('restart'));return
  self.running=True;self.last_error=False;self.tainted.update(pids);self.stop_event=threading.Event()
  self.refresh_button.configure(state='disabled');self.start_button.configure(state='disabled');self.stop_button.configure(state='normal');self.set_status('connecting')
  def work():
   try:engine.main(['--mod-session','--pids',*map(str,pids)],stop_event=self.stop_event,event_callback=lambda x:self.events.put(('engine',x)))
   except Exception as e:self.events.put(('engine',{'event':'host_error','message':str(e)}))
   finally:self.events.put(('finished',None))
  threading.Thread(target=work,daemon=True).start()
 def stop(self):
  if self.running and messagebox.askyesno(self.tr('error'),self.tr('stopconfirm')):self.stop_event.set();self.set_status('stopping');self.stop_button.configure(state='disabled')
 def close(self):
  if self.running:
   if not messagebox.askyesno(self.tr('error'),self.tr('close')):return
   self.closing=True;self.stop_event.set();self.set_status('stopping')
  else:self.root.destroy()
 def log(self,value):
  import json
  text=self.texts[2];text.configure(state='normal');text.insert('end',json.dumps(value,ensure_ascii=False)+'\n')
  if int(text.index('end-1c').split('.')[0])>250:text.delete('1.0','50.0')
  text.see('end');text.configure(state='disabled')
 def drain(self):
  for _ in range(150):
   try:kind,value=self.events.get_nowait()
   except queue.Empty:break
   if kind in ['games','scan_error']:
    self.scanning=False;self.refresh_button.configure(state='normal');self.start_button.configure(state='normal')
    if kind=='games':
     self.rows={r['pid']:r for r in value}
     for item in self.table.get_children():self.table.delete(item)
     for r in value:
      store='Steam' if 'steamapps' in r['path'].lower() else 'Other / Epic*'
      self.table.insert('','end',iid=str(r['pid']),values=(r['pid'],store,r['path']))
     if len(value)==1:self.table.selection_set(str(value[0]['pid']))
     self.set_status('status')
    else:self.set_status('failed');self.log(value)
   elif kind=='engine':
    message=value.get('message',{});message=message if isinstance(message,dict) else {}
    event=value.get('event') or message.get('payload',{}).get('event')
    if event=='pair_enabled':self.set_status('ready')
    if event in ['host_error','fault'] or message.get('type')=='error':self.last_error=True;self.set_status('failed');self.tabs.select(self.pages[2])
    if event!='snapshot':self.log(value)
   elif kind=='finished':
    self.running=False;self.set_status('failed' if self.last_error else 'stopped')
    self.refresh_button.configure(state='normal');self.start_button.configure(state='normal');self.stop_button.configure(state='disabled')
    if self.closing:self.root.destroy();return
  self.root.after(80,self.drain)

def main():
 if '--self-test' in sys.argv:return engine.main(['--self-test'])
 if '--ui-self-test' in sys.argv:
  root=tk.Tk();root.withdraw();app=App(root);root.update_idletasks()
  assert app.lang=='en' and 'BOTH players' in app.warning.cget('text')
  app.switch_language();assert app.lang=='zh' and app.language.cget('text')=='English'
  app.switch_language();assert app.lang=='en' and not app.consent.get() and not app.running
  root.destroy();return 0
 if '--mod-session' in sys.argv or '--local-pair-test' in sys.argv or '--list' in sys.argv:return engine.main()
 root=tk.Tk();App(root);root.mainloop();return 0
if __name__=='__main__':raise SystemExit(main())
