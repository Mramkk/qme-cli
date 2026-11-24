_qme_complete() {
  local commands="help run pilot open ip pem npm npx n timer git mysql flutter adb config update init proj xampp xstart xstop xswitch xini xproj win wintask taskm wl path postman chrome gchat hub mail note notes quit"
  COMPREPLY=( $(compgen -W "$commands" -- "${COMP_WORDS[1]}") )
}

complete -F _qme_complete qme
