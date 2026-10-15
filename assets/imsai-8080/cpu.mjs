// SPDX-License-Identifier: MIT
// Original Intel 8080 interpreter. See README.md for the accuracy contract.
export class Intel8080 {
  constructor({input=()=>0,output=()=>{}}={}) { this.ram=new Uint8Array(65536);this.input=input;this.output=output;this.reset(); }
  reset(){this.a=this.b=this.c=this.d=this.e=this.h=this.l=0;this.pc=0;this.sp=0xffff;this.f=2;this.halted=false;this.inte=false;this.eiDelay=0;this.cycles=0;this.instructions=0;this.lastOpcode=0;}
  get hl(){return this.h<<8|this.l;} set hl(v){this.h=v>>8&255;this.l=v&255;}
  read(a){return this.ram[a&65535];} write(a,v){this.ram[a&65535]=v&255;}
  fetch(){const v=this.read(this.pc);this.pc=this.pc+1&65535;return v;}
  word(){const lo=this.fetch();return lo|this.fetch()<<8;}
  pair(p){return p===0?this.b<<8|this.c:p===1?this.d<<8|this.e:p===2?this.hl:this.sp;}
  setPair(p,v){v&=65535;if(p===0){this.b=v>>8;this.c=v&255;}else if(p===1){this.d=v>>8;this.e=v&255;}else if(p===2)this.hl=v;else this.sp=v;}
  reg(r){return r===6?this.read(this.hl):this[['b','c','d','e','h','l','','a'][r]];}
  setReg(r,v){if(r===6)this.write(this.hl,v);else this[['b','c','d','e','h','l','','a'][r]]=v&255;}
  szp(v){v&=255;let bits=v;bits^=bits>>4;bits^=bits>>2;bits^=bits>>1;return (v&128)|(v===0?64:0)|((bits&1)?0:4)|2;}
  alu(op,v){const a=this.a,carry=this.f&1;let r,ac,cy;
    if(op<2){const c=op===1?carry:0;r=a+v+c;ac=(a&15)+(v&15)+c>15;cy=r>255;}
    else if(op===2||op===3||op===7){const c=op===3?carry:0;r=a-v-c;cy=r<0;/* 8080 AC is carry from complemented subtraction, not 8085 half-borrow. */ac=(a&15)>=(v&15)+c;}
    else if(op===4){r=a&v;cy=false;ac=!!((a|v)&8);}
    else if(op===5){r=a^v;cy=ac=false;}
    else {r=a|v;cy=ac=false;}
    this.f=this.szp(r)|(ac?16:0)|(cy?1:0);if(op!==7)this.a=r&255;
  }
  push(v){this.sp=this.sp-1&65535;this.write(this.sp,v>>8);this.sp=this.sp-1&65535;this.write(this.sp,v);}
  pop(){const lo=this.read(this.sp);this.sp=this.sp+1&65535;const hi=this.read(this.sp);this.sp=this.sp+1&65535;return hi<<8|lo;}
  condition(n){return [!(this.f&64),!!(this.f&64),!(this.f&1),!!(this.f&1),!(this.f&4),!!(this.f&4),!(this.f&128),!!(this.f&128)][n];}
  interrupt(vector){if(!this.inte||this.eiDelay)return false;if(!Number.isInteger(vector)||vector<0||vector>7)throw new RangeError('RST vector 0–7');this.inte=false;this.halted=false;this.push(this.pc);this.pc=vector*8;this.cycles+=11;return true;}
  load(bytes,address=0){for(let i=0;i<bytes.length;i++)this.write(address+i,bytes[i]);}
  step(){if(this.halted)return 0;const op=this.fetch();this.lastOpcode=op;let t=4;const r=op>>3&7,p=op>>4&3;
    if(op>=0x40&&op<=0x7f){if(op===0x76){this.halted=true;t=7;}else{this.setReg(r,this.reg(op&7));t=r===6||(op&7)===6?7:5;}}
    else if(op>=0x80&&op<=0xbf){this.alu(r,this.reg(op&7));t=(op&7)===6?7:4;}
    else if((op&0xc7)===0x04){const v=this.reg(r),n=v+1;this.setReg(r,n);this.f=this.szp(n)|(this.f&1)|((v&15)===15?16:0);t=r===6?10:5;}
    else if((op&0xc7)===0x05){const v=this.reg(r),n=v-1;this.setReg(r,n);this.f=this.szp(n)|(this.f&1)|((v&15)!==0?16:0);t=r===6?10:5;}
    else if((op&0xc7)===0x06){this.setReg(r,this.fetch());t=r===6?10:7;}
    else if((op&0xcf)===0x01){this.setPair(p,this.word());t=10;}
    else if((op&0xcf)===0x03){this.setPair(p,this.pair(p)+1);t=5;}
    else if((op&0xcf)===0x0b){this.setPair(p,this.pair(p)-1);t=5;}
    else if((op&0xcf)===0x09){const v=this.hl+this.pair(p);this.hl=v;this.f=this.f&~1|(v>65535?1:0);t=10;}
    else if((op&0xc7)===0xc0){if(this.condition(r)){this.pc=this.pop();t=11;}else t=5;}
    else if((op&0xc7)===0xc2){const dest=this.word();if(this.condition(r))this.pc=dest;t=10;}
    else if((op&0xc7)===0xc4){const dest=this.word();if(this.condition(r)){this.push(this.pc);this.pc=dest;t=17;}else t=11;}
    else if((op&0xcf)===0xc1){const v=this.pop();if(p===3){this.a=v>>8;this.f=(v&0xd5)|2;}else this.setPair(p,v);t=10;}
    else if((op&0xcf)===0xc5){this.push(p===3?this.a<<8|this.f:this.pair(p));t=11;}
    else if((op&0xc7)===0xc6){this.alu(r,this.fetch());t=7;}
    else if((op&0xc7)===0xc7){this.push(this.pc);this.pc=op&0x38;t=11;}
    else switch(op){
      case 0x00:case 0x08:case 0x10:case 0x18:case 0x20:case 0x28:case 0x30:case 0x38:break;
      case 0x02:case 0x12:this.write(this.pair(op>>4),this.a);t=7;break;
      case 0x0a:case 0x1a:this.a=this.read(this.pair(op>>4));t=7;break;
      case 0x07:{const c=this.a>>7;this.a=(this.a<<1|c)&255;this.f=this.f&~1|c;break;}
      case 0x0f:{const c=this.a&1;this.a=this.a>>1|c<<7;this.f=this.f&~1|c;break;}
      case 0x17:{const c=this.a>>7;this.a=(this.a<<1|(this.f&1))&255;this.f=this.f&~1|c;break;}
      case 0x1f:{const c=this.a&1;this.a=this.a>>1|(this.f&1)<<7;this.f=this.f&~1|c;break;}
      case 0x22:{const a=this.word();this.write(a,this.l);this.write(a+1,this.h);t=16;break;}
      case 0x2a:{const a=this.word();this.l=this.read(a);this.h=this.read(a+1);t=16;break;}
      case 0x27:{const a=this.a;let correction=0;let cy=this.f&1;if((a&15)>9||(this.f&16))correction|=6;if(a>0x99||cy){correction|=0x60;cy=1;}this.a=a+correction&255;this.f=this.szp(this.a)|(((a&15)+(correction&15)>15)?16:0)|cy;break;}
      case 0x2f:this.a^=255;break;
      case 0x32:{const a=this.word();this.write(a,this.a);t=13;break;}
      case 0x3a:{const a=this.word();this.a=this.read(a);t=13;break;}
      case 0x37:this.f|=1;break;case 0x3f:this.f^=1;break;
      case 0xc3:case 0xcb:this.pc=this.word();t=10;break;
      case 0xc9:case 0xd9:this.pc=this.pop();t=10;break;
      case 0xcd:case 0xdd:case 0xed:case 0xfd:{const a=this.word();this.push(this.pc);this.pc=a;t=17;break;}
      case 0xd3:this.output(this.fetch(),this.a);t=10;break;
      case 0xdb:this.a=this.input(this.fetch())&255;t=10;break;
      case 0xe3:{const lo=this.read(this.sp),hi=this.read(this.sp+1);this.write(this.sp,this.l);this.write(this.sp+1,this.h);this.l=lo;this.h=hi;t=18;break;}
      case 0xe9:this.pc=this.hl;t=5;break;
      case 0xeb:{const d=this.d,e=this.e;this.d=this.h;this.e=this.l;this.h=d;this.l=e;t=5;break;}
      case 0xf3:this.inte=false;this.eiDelay=0;break;
      case 0xf9:this.sp=this.hl;t=5;break;
      case 0xfb:this.eiDelay=2;break;
      default:throw new Error('Unimplemented opcode '+op.toString(16));
    }
    if(this.eiDelay&&!--this.eiDelay)this.inte=true;
    this.cycles+=t;this.instructions++;return t;
  }
}

// All demo bytes authored for this exhibit; no ROM or operating system needed.
export const demos={
  hello:{bytes:[0x21,0x0f,0,0x7e,0xb7,0xca,0x0e,0,0xd3,1,0x23,0xc3,3,0,0x76,...new TextEncoder().encode('IMSAI 8080 READY.\r\nHELLO, MUSEUM.\r\n'),0],title:'HELLO / serial output'},
  sum:{bytes:[0x3e,0,0x06,10,0x80,0x05,0xc2,4,0,0x32,0,2,0x76],title:'SUM 1…10 / RAM 0200'},
  counter:{bytes:[0x21,0,2,0x34,0x7e,0xd3,2,0xc3,3,0],title:'COUNTER / RAM 0200'},
  echo:{bytes:[0xdb,0,0xe6,1,0xca,0,0,0xdb,1,0xd3,1,0xc3,0,0],title:'ECHO / keyboard I/O'}
};
// Front-panel state is deliberately separate from PC until RUN is pressed.
export class FrontPanel {
  constructor(cpu){this.cpu=cpu;this.address=0;this.switches=0;}
  examine(){this.address=this.switches&65535;return this.cpu.read(this.address);}
  next(){this.address=this.address+1&65535;return this.cpu.read(this.address);}
  deposit(){this.cpu.write(this.address,this.switches&255);}
  run(){this.cpu.pc=this.address;this.cpu.halted=false;}
  step(){this.cpu.step();this.address=this.cpu.pc;}
}
