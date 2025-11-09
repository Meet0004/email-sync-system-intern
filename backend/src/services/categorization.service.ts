import { Email, EmailCategory } from '../types';

export class CategorizationService {
  
  categorizeEmail(email: Email): EmailCategory {
    const text = `${email.subject} ${email.body}`.toLowerCase();
    
    //Out of Office check   
    if (this.isOutOfOffice(text)) {
      return EmailCategory.OUT_OF_OFFICE;
    }
    
    //Spam check   
    if (this.isSpam(text, email)) {
      return EmailCategory.SPAM;
    }
    
    //Meeting booked check   
    if (this.isMeetingBooked(text)) {
      return EmailCategory.MEETING_BOOKED;
    }
    
    //Interested check   
    if (this.isInterested(text)) {
      return EmailCategory.INTERESTED;
    }
    
    //Not interested check   
    if (this.isNotInterested(text)) {
      return EmailCategory.NOT_INTERESTED;
    }
    
    return EmailCategory.UNCATEGORIZED;
  }

  private isOutOfOffice(text: string): boolean {
    const patterns = [
      'out of office',
      'out of the office',
      'ooo',
      'automatic reply',
      'auto reply',
      'away from office',
      'on vacation',
      'on leave',
      'currently unavailable',
      'away from my desk',
      'not in the office',
      'limited access to email'
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  }

  private isSpam(text: string, email: Email): boolean {
    const spamPatterns = [
      'congratulations you won',
      'claim your prize',
      'click here now',
      'limited time offer',
      'act now',
      'free money',
      'nigerian prince',
      'verify your account',
      'suspended account',
      'unusual activity',
      'confirm your password',
      'you have been selected',
      'winner',
      'lottery',
      'casino',
      'viagra',
      'pharmacy',
      'weight loss',
      'make money fast',
      'work from home',
      'no credit check',
      'refinance'
    ];
    
    const hasSpamPattern = spamPatterns.some(pattern => text.includes(pattern));
    
    //Caps check
    const capsPercentage = (email.subject.match(/[A-Z]/g) || []).length / email.subject.length;
    const excessiveCaps = capsPercentage > 0.5 && email.subject.length > 10;
    
    //From address sus
    const suspiciousFrom = email.from.includes('noreply') || 
                          email.from.includes('no-reply') ||
                          !email.from.includes('@');
    
    return hasSpamPattern || (excessiveCaps && suspiciousFrom);
  }

  private isMeetingBooked(text: string): boolean {
    const patterns = [
      'meeting confirmed',
      'meeting scheduled',
      'meeting booked',
      'calendar invitation',
      'event invitation',
      'has invited you',
      'meeting invite',
      'scheduled a meeting',
      'accepted your meeting',
      'meeting accepted',
      'zoom meeting',
      'google meet',
      'teams meeting',
      'calendar event',
      'appointment confirmed',
      'scheduled for',
      'meeting on',
      'see you at'
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  }

  private isInterested(text: string): boolean {
    const patterns = [
      'interested',
      'would like to know more',
      'tell me more',
      'sounds interesting',
      'sounds good',
      'looks promising',
      'let\'s discuss',
      'let\'s talk',
      'let\'s schedule',
      'can we talk',
      'would like to discuss',
      'want to learn more',
      'please share more',
      'send me more information',
      'more details',
      'please call',
      'looking forward',
      'excited to',
      'great opportunity',
      'resume shortlisted',
      'profile shortlisted',
      'congratulations',
      'move forward',
      'next steps',
      'interview',
      'technical round',
      'when are you available',
      'available for a call',
      'schedule a call',
      'let\'s connect'
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  }

  private isNotInterested(text: string): boolean {
    const patterns = [
      'not interested',
      'no longer interested',
      'not a good fit',
      'not the right fit',
      'pass on this',
      'decline',
      'not at this time',
      'maybe later',
      'not right now',
      'thank you for your interest',
      'we have decided',
      'went with another',
      'selected another candidate',
      'position has been filled',
      'no thank',
      'unsubscribe',
      'remove me',
      'stop sending',
      'not hiring',
      'budget constraints',
      'unfortunately',
      'regret to inform',
      'unable to proceed'
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  }
}
