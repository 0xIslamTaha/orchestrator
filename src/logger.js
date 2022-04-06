function banner() {
  let banner = `
   ██████      ██████       ██████     ██   ██     ███████     ███████     ████████     ██████       █████      ████████      ██████      ██████  
  ██    ██     ██   ██     ██          ██   ██     ██          ██             ██        ██   ██     ██   ██        ██        ██    ██     ██   ██ 
  ██    ██     ██████      ██          ███████     █████       ███████        ██        ██████      ███████        ██        ██    ██     ██████  
  ██    ██     ██   ██     ██          ██   ██     ██               ██        ██        ██   ██     ██   ██        ██        ██    ██     ██   ██ 
   ██████      ██   ██      ██████     ██   ██     ███████     ███████        ██        ██   ██     ██   ██        ██         ██████      ██   ██ 
                                                                                                                             v 2.1.0 @0xIslamTaha                                                                                                                                                                                                                                                                                
`;

  console.log(banner);
}


function step(msg, newLine=false) {
  let message;
  if (newLine) {
    message = `\n[*] ${msg}`; 
  } else {
    message = `[*] ${msg}`;
  }
  console.log(message);
}

function subStep(subStep){
    let message = `[-] ${subStep}`;
    console.log(message);
}

export { banner, step, subStep };
