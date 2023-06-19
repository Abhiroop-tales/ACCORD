import sys, time, psutil

from extractDriveFiles import getUserID

class ExecuteResolutionThread():

    def __init__(self, activityTime, activity, documentId, actor, drive_service):
        try:
            super(ExecuteResolutionThread,self).__init__()
            self.activityTime = activityTime
            self.activity = activity
            self.action = activity.split(':')[0].split('-')[0]
            self.documentId = documentId
            self.actor = actor
            self.driveAPIservice = drive_service
            
        except LookupError as le:
            return("Error in the key or index !!\n" + str(le))
        except ValueError as ve:
            return("Error in Value Entered !!\n" + str(ve))
        except TypeError as te:
            return("Error in Type matching !!\n" + str(te))        

    def run(self):
               
        # Execute your long-running task here
        val = False
        if(self.action == "Permission Change"):
            print("I'm PC Ex")
            val =  self.permissionChangeResolutions()  
        elif(self.action == "Edit"):
            pass
        elif(self.action == "Move"):
            pass
        elif(self.action == "Delete"):
            pass
        else:
            pass

        return val
          
    # Method to handle resolutions related to permission change 
    def permissionChangeResolutions(self):
        try:
            fileID = self.documentId
            actionSplit = self.activity.split(':')
            action = actionSplit[0].split('-')[0]
            toAction = actionSplit[1].split('-')[0]
            fromAction = actionSplit[2].split('-')[0]
            user = actionSplit[3]
            userID = getUserID(self.driveAPIservice, self.documentId, user)
            print("I'm PC Ex1")
            if('none' in fromAction and 'none' not in toAction):
                actionType = "Remove Permission"
            elif('none' not in fromAction and 'none' in toAction):
                actionType = "Add Permission"
            else:
                actionType = "Update Permission"
            

            if('edit' in  fromAction):
                old_role = "writer"
            elif('comment' in fromAction):
                old_role = "commenter"
            else:
                old_role = "reader"
            
            if('edit' in  toAction):
                new_role = "writer"
            elif('comment' in toAction):
                new_role = "commenter"
            else:
                new_role = "reader"
            
            # # Perform action only when action constaint is not present
            # if(self.check_action_constraint(fileID, action, actionType, self.email)):

            # Perform permission Change action based on the input arguments
            match actionType:
                # Add User to the file
                case "Add Permission":
                    permission = {
                        'type': 'user',
                        'role': old_role,
                        'emailAddress': user
                    }
                    self.driveAPIservice.permissions().create(fileId=fileID, body=permission, sendNotificationEmail=False).execute()
                    return True

                case "Remove Permission":
                    # Remove the user ID from the file permissions
                    print("I'm PC Ex2")
                    self.driveAPIservice.permissions().delete(fileId=fileID, permissionId = userID).execute()
                    return True

                case "Update Permission":
                    # Update the permission on file for user from one to another
                    new_user_role = new_role
                    new_permission = {'role' : new_user_role }
                    self.driveAPIservice.permissions().update(fileId=fileID, permissionId = userID, body=new_permission).execute()
                    return True
                
                case _:
                    pass
                
            return False


        except LookupError as le:
            return("Error in the key or index !!\n" + str(le))
        except ValueError as ve:
            return("Error in Value Entered !!\n" + str(ve))
        except TypeError as te:
            return("Error in Type matching !!\n" + str(te))              


