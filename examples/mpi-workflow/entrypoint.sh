#!/usr/bin/env bash
set -euo pipefail

uid="$(id -u)"
gid="$(id -g)"
nss_passwd="/tmp/passwd"
nss_group="/tmp/group"
nss_lib="/usr/lib/x86_64-linux-gnu/libnss_wrapper.so"

# Make arbitrary UIDs resolvable via nss-wrapper.
cp /etc/passwd "${nss_passwd}"
cp /etc/group "${nss_group}"
grep -q "^[^:]*:[^:]*:${uid}:" "${nss_passwd}" || \
  printf 'uid%s:x:%s:%s:MPI User:/tmp:/bin/bash\n' "${uid}" "${uid}" "${gid}" >> "${nss_passwd}"
grep -q "^[^:]*:[^:]*:${gid}:" "${nss_group}" || \
  printf 'gid%s:x:%s:\n' "${gid}" "${gid}" >> "${nss_group}"

export NSS_WRAPPER_PASSWD="${nss_passwd}" NSS_WRAPPER_GROUP="${nss_group}"
case ":${LD_PRELOAD:-}:" in
  *":${nss_lib}:"*) ;;
  *) export LD_PRELOAD="${nss_lib}${LD_PRELOAD:+:${LD_PRELOAD}}" ;;
esac

# Ensure writable HOME with .ssh dir.
if [ -z "${HOME:-}" ] || [ "${HOME}" = "/" ] || [ ! -w "${HOME}" ]; then
  export HOME=/tmp
fi
install -d -m 0700 "${HOME}/.ssh"

# Copy SSH keys from the operator-mounted read-only source to a writable dir.
ssh_src="${MPI_SSH_AUTH_MOUNT_PATH:-/opt/mpi/ssh-src}"
ssh_dir="${MPI_SSH_RUNTIME_DIR:-/tmp/mpi-ssh}"

if [ -d "${ssh_src}" ]; then
  install -d -m 0700 "${ssh_dir}"

  # Normalize key to id_rsa — operator may generate id_rsa, id_ecdsa, or id_ed25519.
  for key_name in id_rsa id_ecdsa id_ed25519; do
    [ -f "${ssh_src}/${key_name}" ] || continue
    install -m 0600 "${ssh_src}/${key_name}" "${ssh_dir}/id_rsa"
    if [ -f "${ssh_src}/${key_name}.pub" ]; then
      install -m 0644 "${ssh_src}/${key_name}.pub" "${ssh_dir}/id_rsa.pub"
    fi
    break
  done

  # Copy authorized_keys; derive from pub key if the operator didn't include it.
  if [ -f "${ssh_src}/authorized_keys" ]; then
    install -m 0600 "${ssh_src}/authorized_keys" "${ssh_dir}/authorized_keys"
  elif [ -f "${ssh_dir}/id_rsa.pub" ]; then
    install -m 0600 "${ssh_dir}/id_rsa.pub"      "${ssh_dir}/authorized_keys"
  fi
fi

# Configure mpirun's SSH agent with the right identity and options.
if [ -f "${ssh_dir}/id_rsa" ]; then
  _rsh="ssh -p 2222 -i ${ssh_dir}/id_rsa -o IdentitiesOnly=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ConnectionAttempts=10"
  export OMPI_MCA_plm_rsh_agent="${OMPI_MCA_plm_rsh_agent:-${_rsh}}"
  export PRTE_MCA_plm_rsh_agent="${PRTE_MCA_plm_rsh_agent:-${_rsh}}"
fi

exec "$@"
