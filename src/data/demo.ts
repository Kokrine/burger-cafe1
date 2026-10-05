// დემო კლასი ოფლაინ რეჟიმისთვის (იქმნება მხოლოდ მაშინ, როცა მოწყობილობაზე
// ჯერ არცერთი კლასი არ არის). სატესტო მონაცემებია — რეალური ანგარიშები არ არის.
import type { Grade } from '../core/types';

export const DEMO = {
  teacherEmail: 'demo@cafe.ge',
  teacherPassword: 'demo1234',
  className: 'დემო კლასი',
  classCode: 'DEMO42',
  grade: 2 as Grade,
  students: ['ნიკა', 'მარიამი', 'გიორგი', 'ანა'],
  pin: '1234',
};
