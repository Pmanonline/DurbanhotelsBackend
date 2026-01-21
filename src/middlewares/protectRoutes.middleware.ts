import { Request, Response, NextFunction } from "express";
import IndividualUser from "../modules/authentication/individualUserAuth/individualUserAuth.model1";
import OrganizationModel from "../modules/authentication/organizationUserAuth/organizationAuth.model";

const protectRoutes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = res.locals.user;

  if (!user) {
    return res.sendStatus(403);
  }
  try {
    const userExists =
      user.role === "ind" || user.role === "g-ind"
        ? await IndividualUser.findOne({ email: user.userData.email })
        : await OrganizationModel.findOne({
            organization_email: user.userData.organization_email,
          });

    if (!userExists)
      return res.status(403).json({
        message: "User does not exist",
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message,
    });
  }

  return next();
};

export default protectRoutes;
