import { LegalLayout, LegalSection } from './LegalLayout';

const EFFECTIVE_DATE = '2026-05-07';

export function PrivacyContent() {
  return (
    <LegalLayout title="개인정보처리방침" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection id="overview" title="1. 총칙">
        <p>
          Catch Stock(이하 &quot;회사&quot;)은 이용자의 개인정보를 중요시하며,
          「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 회사가 제공하는 서비스에서
          개인정보를 어떻게 수집·이용·보관·파기하는지에 관한 사항을 규정합니다.
        </p>
      </LegalSection>

      <LegalSection id="items" title="2. 수집하는 개인정보 항목">
        <p>회사는 회원가입 시 Google OAuth를 통해 다음의 항목을 제공받습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>필수: 이름, 이메일 주소, Google 계정 식별자(sub)</li>
          <li>선택: 프로필 이미지 URL</li>
        </ul>
        <p>
          그 외 서비스 이용 과정에서 자동으로 수집되는 정보로 IP 주소, 브라우저 종류, 접속
          기록, 쿠키 정보가 있습니다.
        </p>
      </LegalSection>

      <LegalSection id="method" title="3. 수집 방법">
        <ul className="list-disc space-y-1 pl-5">
          <li>이용자가 Google 계정으로 로그인할 때 OAuth 콜백을 통해 자동 수집</li>
          <li>서비스 이용 과정에서 자동 생성되는 로그</li>
        </ul>
      </LegalSection>

      <LegalSection id="purpose" title="4. 수집 및 이용 목적">
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 식별 및 본인 확인</li>
          <li>서비스 제공, 유지·관리 및 개선</li>
          <li>부정 이용 방지 및 서비스 안정성 확보</li>
          <li>법령상 의무 이행</li>
        </ul>
      </LegalSection>

      <LegalSection id="retention" title="5. 보유 및 이용 기간">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            원칙: 회원 탈퇴 시 즉시 파기. 다만 관계 법령에 따라 보존 의무가 있는 경우 해당 기간
            동안 보존 후 파기.
          </li>
          <li>로그 정보(접속 기록 등): 최대 3개월</li>
        </ul>
      </LegalSection>

      <LegalSection id="third-party" title="6. 제3자 제공 및 처리 위탁">
        <p>
          회사는 이용자의 개인정보를 동의 없이 제3자에게 제공하지 않습니다. 다만 안정적 서비스
          제공을 위하여 다음과 같이 처리 업무를 위탁합니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Google LLC: OAuth 인증 처리</li>
          <li>Neon, Inc.: 데이터베이스 호스팅(Postgres)</li>
        </ul>
        <p>위탁 업무 내용이 변경되거나 위탁 업체가 변경될 경우 본 방침을 통해 공개합니다.</p>
      </LegalSection>

      <LegalSection id="rights" title="7. 이용자의 권리">
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>개인정보 열람 요청</li>
          <li>개인정보 정정·삭제 요청</li>
          <li>개인정보 처리 정지 요청</li>
          <li>회원 탈퇴(즉시 처리, 모든 개인정보 영구 삭제)</li>
        </ul>
        <p>
          회원 탈퇴는 헤더 메뉴 &gt; 회원탈퇴를 통해 진행할 수 있으며, 탈퇴 즉시 회원의 모든
          개인정보가 데이터베이스에서 삭제됩니다.
        </p>
      </LegalSection>

      <LegalSection id="security" title="8. 안전성 확보 조치">
        <ul className="list-disc space-y-1 pl-5">
          <li>모든 통신 구간에 HTTPS(TLS) 적용</li>
          <li>OAuth 표준에 따른 인증 처리 (회사가 비밀번호를 직접 보유하지 않음)</li>
          <li>최소 권한 원칙에 따른 데이터 접근 통제</li>
          <li>주기적인 의존성 점검 및 보안 업데이트</li>
        </ul>
      </LegalSection>

      <LegalSection id="contact" title="9. 개인정보 보호책임자 및 문의">
        <p>개인정보 처리에 관한 문의는 아래 연락처로 보내주시기 바랍니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>개인정보 보호책임자: Catch Stock 운영팀</li>
          <li>이메일: privacy@catch-stock.example</li>
        </ul>
      </LegalSection>

      <LegalSection id="changes" title="10. 방침의 변경">
        <p>
          본 방침이 변경되는 경우 시행 7일 전부터 서비스 내 공지사항을 통해 안내합니다. 다만
          이용자 권리에 중대한 변경이 있는 경우 30일 전부터 안내합니다.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
