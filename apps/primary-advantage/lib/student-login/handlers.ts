import { db } from "@reading-advantage/db";
import { studentLogin as sl } from "@reading-advantage/domain";
import { signInResponse, studentHandler, studentLoginStore as store, teacherHandler } from "./http";

/** POST: teacher starts the class login session. Returns the code once. */
export const startClass = teacherHandler(sl.classSessionStartInput, ({ user, meta, input }) =>
  sl.startClassSession({ db, user, actor: meta, input }),
);

/** POST: teacher ends the class login session. */
export const endClass = teacherHandler(sl.classSessionEndInput, ({ user, meta, input }) =>
  sl.endClassSession({ db, user, actor: meta, input }),
);

/** POST: teacher assigns picture passwords to students that have none. Returns the sequences once. */
export const assignPictures = teacherHandler(sl.assignPicturePasswordsInput, ({ user, meta, input }) =>
  sl.assignPicturePasswords({ db, user, meta, input }),
);

/** POST: teacher resets the picture password of one student. Returns the new sequence once. */
export const resetPicture = teacherHandler(sl.resetPicturePasswordInput, ({ user, meta, input }) =>
  sl.resetPicturePassword({ db, user, meta, input }),
);

/** POST: teacher turns the picture password of the class on or off. */
export const setPictureSetting = teacherHandler(sl.picturePasswordSettingInput, async ({ user, meta, input }) => {
  await sl.setPicturePasswordEnabled({ db, user, meta, input });
  return { enabled: input.enabled };
});

/** POST: teacher reads the students who are locked now. */
export const listLockouts = teacherHandler(sl.assignPicturePasswordsInput, async ({ user, input }) => ({
  locked: await sl.getClassLockouts({ db, user, input }),
}));

/** POST: student enters a code and gets the name list. */
export const enterCode = studentHandler(sl.codeEntryInput, async ({ meta, input }) => ({
  body: await sl.getNameListForCode({ db, store, ip: meta.ip, input }),
}));

/** POST: student signs in with the picture password. Sets the session cookie. */
export const pictureSignIn = studentHandler(sl.picturePasswordSignInInput, async ({ meta, input }) =>
  signInResponse(await sl.signInWithPicture({ db, store, meta, input })),
);

/** POST: student signs in with code and name when the class picture password is off. */
export const codeOnlySignIn = studentHandler(sl.codeOnlySignInInput, async ({ meta, input }) =>
  signInResponse(await sl.signInWithCodeOnly({ db, store, meta, input })),
);
