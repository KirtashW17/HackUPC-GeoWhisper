# Abstract base for every Action Mailer in the app.
#
# Sets the default +From+ address and layout so concrete mailers only need
# to declare their +mail+ calls.
class ApplicationMailer < ActionMailer::Base
  default from: "from@example.com"
  layout "mailer"
end
