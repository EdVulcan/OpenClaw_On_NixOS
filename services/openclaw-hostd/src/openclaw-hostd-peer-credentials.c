#define _GNU_SOURCE

#include <grp.h>
#include <pwd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>

static void usage(const char *program) {
  fprintf(stderr, "usage: %s --user USER --group GROUP\n", program);
}
int main(int argc, char **argv) {
  const char *expected_user = NULL;
  const char *expected_group = NULL;
  struct passwd *user_entry;
  struct group *group_entry;
  struct ucred peer;
  socklen_t peer_length = sizeof(peer);

  for (int index = 1; index < argc; index += 1) {
    if (strcmp(argv[index], "--user") == 0 && index + 1 < argc) {
      expected_user = argv[++index];
    } else if (strcmp(argv[index], "--group") == 0 && index + 1 < argc) {
      expected_group = argv[++index];
    } else {
      usage(argv[0]);
      return 64;
    }
  }

  if (!expected_user || !expected_group) {
    usage(argv[0]);
    return 64;
  }

  user_entry = getpwnam(expected_user);
  group_entry = getgrnam(expected_group);
  if (!user_entry || !group_entry) return 11;

  if (getsockopt(STDIN_FILENO, SOL_SOCKET, SO_PEERCRED, &peer, &peer_length) != 0) {
    return 11;
  }
  if (peer.uid != user_entry->pw_uid) return 10;
  if (peer.gid != group_entry->gr_gid) return 12;
  return 0;
}
